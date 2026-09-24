import { normalizarCampo, removerInvisiveis } from './text.ts';
// Etapa 4 · a parte DETERMINISTICA do agente.
//
// O agente nao e' "uma chamada de LLM". Ele e' um pipeline:
//   extrai (modelo) -> compoe -> guard -> fallback
// O modelo faz a unica coisa que so' ele faz bem: ler texto livre bagunçado e
// devolver estrutura. A redacao final e o que se pergunta ao lead saem daqui,
// de codigo puro e testavel — e' por isso que a mensagem nunca inventa preco,
// disponibilidade ou horario: nao existe caminho no codigo para isso aparecer.
//
// Este arquivo tambem e' o FALLBACK: se a API falhar ou o guard rejeitar a
// saida do modelo, a mesma funcao produz uma mensagem util, rotulada como tal.

export type FaltaSaber =
  | 'bairro'
  | 'orcamento'
  | 'dormitorios'
  | 'prazo'
  | 'financiamento'
  | 'visita';

export interface Extracao {
  tipo_imovel: string | null;
  bairro: string | null;
  dormitorios: number | null;
  sinal_orcamento: string | null;
  intencao: 'compra' | 'aluguel' | 'investimento' | 'indefinido';
  falta_saber: FaltaSaber[];
}

/**
 * Ordem em que uma informacao faltante vira A pergunta da mensagem.
 *
 * Nao e' arbitraria: sem regiao nao da' nem para separar opcao, entao bairro
 * vem antes de tudo; faixa de investimento e' o filtro seguinte mais forte no
 * alto padrao; visita fica por ultimo porque so' faz sentido quando ja' se sabe
 * o que mostrar. So' UMA pergunta por mensagem — primeira mensagem com tres
 * perguntas e' formulario, e formulario nao e' respondido.
 */
export const PRIORIDADE_PERGUNTA: readonly FaltaSaber[] = [
  'bairro',
  'orcamento',
  'dormitorios',
  'prazo',
  'financiamento',
  'visita',
];

/**
 * Registro formal e NEUTRO. Nada de "o senhor"/"a senhora": o sistema so' tem
 * o nome do lead, e nome nao diz como a pessoa quer ser tratada. Errar isso
 * numa primeira mensagem de alto padrao custa mais do que soar impessoal.
 */
export const PERGUNTAS: Record<FaltaSaber, string> = {
  bairro: 'em quais regiões da cidade prefere concentrar a busca?',
  orcamento: 'qual faixa de investimento tem em mente para esta aquisição?',
  dormitorios: 'quantos dormitórios atenderiam à sua necessidade?',
  prazo: 'há algum prazo em mente para a mudança?',
  financiamento: 'a aquisição seria à vista ou com financiamento?',
  visita: 'posso reservar um horário nesta semana para uma visita?',
};

export function escolherPergunta(falta: readonly FaltaSaber[]): FaltaSaber {
  for (const candidata of PRIORIDADE_PERGUNTA) {
    if (falta.includes(candidata)) return candidata;
  }
  // Lead que ja' informou tudo nao precisa de mais triagem: precisa de agenda.
  return 'visita';
}

export function primeiroNome(nome: string): string {
  const primeiro = nome.trim().split(/\s+/)[0] ?? '';
  if (primeiro.length === 0) return '';
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
}

/**
 * Descreve o interesse a partir da extracao, sem nunca acrescentar fato.
 * "na região de X" em vez de "no X"/"na X" evita errar a preposicao para
 * bairro que o sistema nunca viu.
 */
export function descreverInteresse(e: Extracao): string {
  const tipo = e.tipo_imovel?.trim() || 'imóvel';
  const partes: string[] = [tipo];

  if (e.dormitorios && e.dormitorios > 0) {
    partes.push(`de ${e.dormitorios} ${e.dormitorios === 1 ? 'dormitório' : 'dormitórios'}`);
  }
  if (e.bairro?.trim()) {
    partes.push(`na região de ${e.bairro.trim()}`);
  }

  let texto = partes.join(' ');
  if (e.sinal_orcamento?.trim()) {
    texto += `, na faixa de ${e.sinal_orcamento.trim()}`;
  }
  return texto;
}

export interface MensagemComposta {
  mensagem: string;
  pergunta: FaltaSaber;
}

/**
 * Mensagem deterministica. E' o fallback do pipeline e tambem o piso de
 * qualidade: se o modelo nao superar isto, nao ha' motivo para usar o modelo.
 */
export function comporMensagem(nome: string, extracao: Extracao): MensagemComposta {
  const pergunta = escolherPergunta(extracao.falta_saber);
  const saudacao = primeiroNome(nome) ? `Olá, ${primeiroNome(nome)}!` : 'Olá!';

  const mensagem =
    `${saudacao} Aqui é da CRI Soluções Imobiliárias, obrigado pelo seu contato.\n\n` +
    `Anotei seu interesse em ${descreverInteresse(extracao)}. ` +
    `Para eu separar as opções mais alinhadas antes de enviar qualquer material, ` +
    `${PERGUNTAS[pergunta]}`;

  return { mensagem, pergunta };
}

// ---------------------------------------------------------------------------
// Saneamento da extracao
// ---------------------------------------------------------------------------
// ⚠️ ESTA FUNCAO E' A FRONTEIRA DE CONFIANCA DO PIPELINE.
//
// O passo 1 (extracao) le o texto livre do lead, que e' entrada hostil. O que
// ele devolve e', portanto, derivado de entrada hostil — e vai ser usado em
// dois lugares perigosos: dentro do prompt do passo 2 e dentro da mensagem
// final. Se a extracao passasse crua, a injecao so' teria mudado de vagao.
//
// Entao tudo que sai do passo 1 e' tratado como string desconhecida: tipo
// forcado, tamanho cortado, controle removido, valor fora do dominio virando
// null. Depois daqui, o passo 2 nao vê mais nenhum byte escrito pelo lead.

const LIMITE_CAMPO = 80;

// Caracteres que abrem estrutura. Filtrados como conjunto, e nao por regex,
// so para manter este arquivo livre de escape — a licao esta em text.ts.
const ABRE_ESTRUTURA = new Set(['<', '>', '{', '}', '[', ']']);

function campoCurto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const semEstrutura = [...removerInvisiveis(valor)]
    .filter((c) => !ABRE_ESTRUTURA.has(c))
    .join('');
  const limpo = normalizarCampo(semEstrutura, LIMITE_CAMPO);
  return limpo.length === 0 ? null : limpo;
}

const INTENCOES: readonly Extracao['intencao'][] = [
  'compra',
  'aluguel',
  'investimento',
  'indefinido',
];

const FALTAS: readonly FaltaSaber[] = PRIORIDADE_PERGUNTA;

export function sanitizarExtracao(bruto: unknown): Extracao {
  if (typeof bruto !== 'object' || bruto === null || Array.isArray(bruto)) {
    return extracaoVazia();
  }
  const e = bruto as Record<string, unknown>;

  // Dormitorios so' existe se for inteiro plausivel. Numero absurdo vindo do
  // modelo vira null em vez de entrar na mensagem.
  let dormitorios: number | null = null;
  const n = typeof e.dormitorios === 'string' ? Number(e.dormitorios) : e.dormitorios;
  if (typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 20) {
    dormitorios = n;
  }

  const intencao = INTENCOES.includes(e.intencao as Extracao['intencao'])
    ? (e.intencao as Extracao['intencao'])
    : 'indefinido';

  const falta = Array.isArray(e.falta_saber)
    ? (e.falta_saber.filter((f) => FALTAS.includes(f as FaltaSaber)) as FaltaSaber[])
    : [];

  return {
    tipo_imovel: campoCurto(e.tipo_imovel),
    bairro: campoCurto(e.bairro),
    dormitorios,
    sinal_orcamento: campoCurto(e.sinal_orcamento),
    intencao,
    falta_saber: [...new Set(falta)],
  };
}

/** Extracao vazia, usada quando nem o passo de extracao foi possivel. */
export function extracaoVazia(): Extracao {
  return {
    tipo_imovel: null,
    bairro: null,
    dormitorios: null,
    sinal_orcamento: null,
    intencao: 'indefinido',
    falta_saber: ['bairro', 'orcamento', 'dormitorios'],
  };
}
