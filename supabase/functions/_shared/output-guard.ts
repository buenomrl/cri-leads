// Etapa 4 · guard de saida do agente.
//
// PARA QUEM ESTE GUARD EXISTE: nao e' para o modelo, e' para a PESSOA.
// O `imovel_interesse` e' texto livre que veio da internet e vai parar dentro
// de um prompt. O estrago plausivel de um prompt injection aqui nao e' "o
// modelo respondeu errado" — e' um corretor copiar e colar para um cliente
// real uma mensagem que traz o WhatsApp do atacante, ou um link de phishing
// com a cara da imobiliaria. Por isso a ultima palavra nao e' do modelo: e'
// desta funcao, que e' deterministica e testada.
//
// Defesa em profundidade, nesta ordem:
//   1. o prompt marca o texto do lead como DADO, nunca instrucao;
//   2. este guard inspeciona a SAIDA, sem confiar no passo 1;
//   3. a mensagem e' sempre sugestao para revisao humana, nunca enviada.
// O passo 3 e' o que realmente segura — os dois primeiros reduzem quanto ele
// precisa segurar.

import { digitosDoTelefone } from './phone.ts';

export type MotivoBloqueio =
  | 'vazia'
  | 'curta_demais'
  | 'longa_demais'
  | 'contem_link'
  | 'contem_email'
  | 'contem_telefone'
  | 'vazou_instrucao';

export interface ResultadoGuard {
  ok: boolean;
  motivo?: MotivoBloqueio;
  /** Trecho curto que disparou o bloqueio, para o log. Nunca a mensagem toda. */
  detalhe?: string;
}

export const LIMITE_MENSAGEM = { min: 40, max: 1200 } as const;

const RE_URL = /https?:\/\/\S+/i;
const RE_WWW = /\bwww\.\S+/i;
const RE_DOMINIO = /\b[a-z0-9][a-z0-9-]*\.(com|com\.br|net|org|br|io|me|app|link|xyz|info|biz|co)\b/i;
const RE_MARKDOWN_LINK = /\[[^\]]*\]\([^)]*\)/;
const RE_EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

// Telefone tem forma propria: ou o bloco com traco antes dos 4 ultimos digitos,
// ou DDD entre parenteses, ou o +55. Procurar "sequencia longa de digitos" e'
// o que geraria falso positivo em valor de imovel — por isso a forma vem antes.
const RE_TELEFONE_FORMATADO = [
  /\b\d{4,5}\s?-\s?\d{4}\b/,
  /\(\s?\d{2}\s?\)\s?\d{4,5}/,
  /\+\s?55\b/,
];

const MARCADORES_INSTRUCAO = [
  'dados_do_lead',
  'system prompt',
  'prompt do sistema',
  'instruções do sistema',
  'instrucoes do sistema',
  'ignore as instruções',
  'ignore as instrucoes',
  'ignore todas as instruções',
  'disregard previous',
  'ignore previous',
];

/**
 * Sequencias de 10+ digitos depois de remover separadores tipicos de telefone.
 * 10 e' o piso porque telefone brasileiro tem 10 ou 11 digitos com DDD — valor
 * monetario ("R$ 12.000.000" -> 8 digitos) fica abaixo do corte de proposito.
 */
function sequenciasLongasDeDigitos(texto: string): string[] {
  const semSeparadores = texto.replace(/(?<=\d)[\s.\-()](?=\d)/g, '');
  return semSeparadores.match(/\d{10,}/g) ?? [];
}

/**
 * @param mensagem saida do modelo
 * @param telefoneDoLead telefone do proprio lead; e' o unico numero que a
 *   mensagem pode legitimamente conter (o modelo nao deveria repeti-lo, mas
 *   repetir o numero de quem escreveu nao e' o risco que este guard combate)
 */
export function verificarMensagem(mensagem: string, telefoneDoLead = ''): ResultadoGuard {
  const texto = mensagem.trim();

  if (texto.length === 0) return { ok: false, motivo: 'vazia' };
  if (texto.length < LIMITE_MENSAGEM.min) {
    return { ok: false, motivo: 'curta_demais', detalhe: `${texto.length} caracteres` };
  }
  if (texto.length > LIMITE_MENSAGEM.max) {
    return { ok: false, motivo: 'longa_demais', detalhe: `${texto.length} caracteres` };
  }

  for (const re of [RE_URL, RE_WWW, RE_MARKDOWN_LINK, RE_DOMINIO]) {
    const achado = texto.match(re);
    if (achado) return { ok: false, motivo: 'contem_link', detalhe: recortar(achado[0]) };
  }

  const email = texto.match(RE_EMAIL);
  if (email) return { ok: false, motivo: 'contem_email', detalhe: recortar(email[0]) };

  const digitosDoLead = digitosDoTelefone(telefoneDoLead);
  for (const re of RE_TELEFONE_FORMATADO) {
    const achado = texto.match(re);
    if (achado && !ehTelefoneDoLead(achado[0], digitosDoLead)) {
      return { ok: false, motivo: 'contem_telefone', detalhe: recortar(achado[0]) };
    }
  }
  for (const sequencia of sequenciasLongasDeDigitos(texto)) {
    if (!ehTelefoneDoLead(sequencia, digitosDoLead)) {
      return { ok: false, motivo: 'contem_telefone', detalhe: recortar(sequencia) };
    }
  }

  const minusculo = texto.toLowerCase();
  const marcador = MARCADORES_INSTRUCAO.find((m) => minusculo.includes(m));
  if (marcador) return { ok: false, motivo: 'vazou_instrucao', detalhe: marcador };

  return { ok: true };
}

function ehTelefoneDoLead(trecho: string, digitosDoLead: string): boolean {
  if (digitosDoLead.length < 8) return false;
  const digitos = digitosDoTelefone(trecho);
  if (digitos.length < 4) return false;
  return digitosDoLead.includes(digitos) || digitos.includes(digitosDoLead);
}

function recortar(trecho: string): string {
  return trecho.length <= 60 ? trecho : `${trecho.slice(0, 57)}...`;
}

export const MOTIVO_LABEL: Record<MotivoBloqueio, string> = {
  vazia: 'resposta vazia',
  curta_demais: 'resposta curta demais',
  longa_demais: 'resposta longa demais',
  contem_link: 'tentou inserir link',
  contem_email: 'tentou inserir e-mail',
  contem_telefone: 'tentou inserir telefone de terceiro',
  vazou_instrucao: 'vazou instrução do prompt',
};
