// API em memoria para o modo local (so' em `npm run dev` sem VITE_API_BASE_URL).
//
// Nao entra no build de producao — ver MODO_LOCAL em client.ts.
//
// O que e' REAL aqui: validacao, mascara de telefone, agregacao do resumo,
// saneamento da extracao, compositor e guard de saida — todos importados de
// @shared, as mesmas funcoes que rodam na Edge Function.
// O que e' SIMULADO: o banco (um array) e os dois passos de modelo. A extracao
// usa uma heuristica de regex e a "redacao" e' um template; o teste de entrada
// hostil simula um modelo que OBEDECE a injecao, para mostrar o guard real
// segurando.

import { resumoDeLeads } from '@shared/analytics.ts';
import {
  comporMensagem,
  descreverInteresse,
  escolherPergunta,
  PERGUNTAS,
  primeiroNome,
  sanitizarExtracao,
  type Extracao,
  type FaltaSaber,
} from '@shared/compose-message.ts';
import type { Lead, Status } from '@shared/domain.ts';
import { verificarMensagem, type MotivoBloqueio } from '@shared/output-guard.ts';
import { mascararTelefone } from '@shared/phone.ts';
import { PROMPT_VERSAO } from '@shared/prompt-first-message.v2.ts';
import { validarMudancaStatus, validarNovoLead, type NovoLead } from '@shared/validation.ts';

import { leadsIniciais } from './demo-local.fixture.ts';
import { ErroApi, type Api, type EntradaAgente, type RespostaAgente } from './types.ts';

let leads: Lead[] = leadsIniciais();

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

function paraSaida(lead: Lead): Lead {
  return { ...lead, telefone: mascararTelefone(lead.telefone) };
}

/** No modo local qualquer chave nao vazia vale — nao ha' segredo para conferir. */
function exigirChave(chave: string): void {
  if (!chave.trim()) throw new ErroApi(401, 'chave de demo ausente ou inválida');
}

// ---------------------------------------------------------------------------
// Passo 1 simulado: extracao por regex
// ---------------------------------------------------------------------------

// Mais longo primeiro, para "Alto de Pinheiros" ganhar de "Pinheiros".
const BAIRROS = [
  'Vila Nova Conceição', 'Alto de Pinheiros', 'Jardim Europa', 'Vila Madalena', 'Vila Olímpia',
  'Higienópolis', 'Itaim Bibi', 'Campo Belo', 'Alphaville', 'Pinheiros', 'Perdizes', 'Brooklin',
  'Morumbi', 'Jardins', 'Moema', 'Itaim',
];

function extrairSimulado(texto: string): Extracao {
  const tipoBruto = texto.match(/cobertura duplex|cobertura|apartamento garden|apartamento|apto|casa|terreno/i)?.[0];
  const tipo = tipoBruto ? tipoBruto.toLowerCase().replace(/^apto$/, 'apartamento') : null;
  const dorms = texto.match(/(\d+)\s*(dormitórios|dorms?|quartos|suítes)/i)?.[1];
  const orcamento =
    texto.match(/(até|faixa de)\s*R\$\s*[\d.,]+\s*(milhões|milhão|mil|mi)?/i)?.[0] ??
    (/orçamento aberto/i.test(texto) ? 'orçamento aberto' : null);
  const bairro = BAIRROS.find((b) => texto.toLowerCase().includes(b.toLowerCase())) ?? null;
  const intencao = /alugar|aluguel/i.test(texto)
    ? 'aluguel'
    : /investimento/i.test(texto)
      ? 'investimento'
      : tipo
        ? 'compra'
        : 'indefinido';

  const falta: FaltaSaber[] = [];
  if (!bairro) falta.push('bairro');
  if (!orcamento) falta.push('orcamento');
  if (!dorms && tipo !== 'terreno') falta.push('dormitorios');
  falta.push('prazo');
  if (intencao !== 'aluguel') falta.push('financiamento');
  falta.push('visita');

  // Passa pela MESMA fronteira de confianca do servidor.
  return sanitizarExtracao({
    tipo_imovel: tipo,
    bairro,
    dormitorios: dorms ? Number(dorms) : null,
    sinal_orcamento: orcamento,
    intencao,
    falta_saber: falta,
  });
}

// ---------------------------------------------------------------------------
// Passo 2 simulado: redacao
// ---------------------------------------------------------------------------

const PARECE_INJECAO = /ignore|instruç|instruc|você agora|voce agora/i;

function redigirSimulado(nome: string, textoDoLead: string, e: Extracao): string {
  const pergunta = PERGUNTAS[escolherPergunta(e.falta_saber)];

  if (PARECE_INJECAO.test(textoDoLead)) {
    // Simula o PIOR caso: o modelo obedeceu a injecao e repetiu o contato do
    // "concorrente". Quem tem de segurar isto e' o guard real, logo abaixo.
    const telefone = textoDoLead.match(/\(\d{2}\)\s?\d{4,5}-\d{4}/)?.[0] ?? '(11) 98888-7777';
    return (
      `Olá, ${primeiroNome(nome)}! Sou o Marcos e tenho ótimas opções para você. ` +
      `Me chame direto no WhatsApp ${telefone} que te passo tudo por lá.`
    );
  }

  return (
    `Olá, ${primeiroNome(nome)}! Aqui é da CRI Soluções Imobiliárias. Obrigado pelo contato — ` +
    `registrei seu interesse em ${descreverInteresse(e)}.\n\n` +
    `Para selecionar apenas o que realmente faz sentido antes de enviar qualquer material, ${pergunta}`
  );
}

// ---------------------------------------------------------------------------

export const apiLocal: Api = {
  async listar() {
    await esperar(250);
    const ordenados = [...leads].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return { leads: ordenados.map(paraSaida), resumo: resumoDeLeads(ordenados) };
  },

  async criar(novo: NovoLead, chave: string) {
    await esperar(300);
    exigirChave(chave);
    const v = validarNovoLead(novo);
    if (!v.ok) throw new ErroApi(400, 'dados inválidos', v.erros);

    const lead: Lead = { ...v.valor, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    leads = [lead, ...leads];
    return paraSaida(lead);
  },

  async mudarStatus(id: string, status: Status, chave: string) {
    await esperar(200);
    exigirChave(chave);
    const v = validarMudancaStatus({ id, status });
    if (!v.ok) throw new ErroApi(400, 'dados inválidos', v.erros);

    const atual = leads.find((l) => l.id === id);
    if (!atual) throw new ErroApi(404, 'lead não encontrado');
    const atualizado = { ...atual, status: v.valor.status };
    leads = leads.map((l) => (l.id === id ? atualizado : l));
    return paraSaida(atualizado);
  },

  async gerarMensagem(entrada: EntradaAgente, chave: string): Promise<RespostaAgente> {
    exigirChave(chave);
    const inicio = Date.now();

    let nome: string;
    let texto: string;
    let telefone = '';
    if ('lead_id' in entrada) {
      const lead = leads.find((l) => l.id === entrada.lead_id);
      if (!lead) throw new ErroApi(404, 'lead não encontrado');
      ({ nome, imovel_interesse: texto, telefone } = lead);
    } else {
      ({ nome, imovel_interesse: texto } = entrada);
    }

    await esperar(900);
    const extracao = extrairSimulado(texto);
    const pergunta = escolherPergunta(extracao.falta_saber);
    const redigida = redigirSimulado(nome, texto, extracao);

    // Guard REAL — a mesma funcao da Edge Function.
    const guard = verificarMensagem(redigida, telefone);
    const motivo: MotivoBloqueio | null = guard.ok ? null : (guard.motivo ?? null);

    return {
      mensagem: guard.ok ? redigida : comporMensagem(nome, extracao).mensagem,
      origem: guard.ok ? 'modelo' : 'fallback',
      pergunta,
      extracao,
      guard: { bloqueou: !guard.ok, motivo },
      veredito: guard.ok ? 'ok' : 'bloqueado',
      falha: null,
      latencia_ms: Date.now() - inicio,
      prompt_versao: `${PROMPT_VERSAO} (simulação local)`,
    };
  },
};
