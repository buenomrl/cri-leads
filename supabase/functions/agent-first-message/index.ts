// Etapa 4 · o agente.
//
// Dado um lead (nome + texto livre do imovel de interesse), sugere a primeira
// mensagem de resposta. A mensagem NAO e' enviada a ninguem: ela volta para a
// tela como sugestao para uma pessoa revisar. Essa e' a ultima linha de defesa
// do sistema e tambem a mais honesta — as outras existem para diminuir o
// quanto ela precisa segurar.
//
// O pipeline:
//
//   texto livre (NAO CONFIAVEL)
//        v
//   [1] extracao ............ Haiku, saida obrigatoriamente JSON de dominio fechado
//        v
//   sanitizarExtracao ....... FRONTEIRA DE CONFIANCA: tipo forcado, corte,
//        v                    tag e controle removidos
//   [2] redacao ............. Sonnet, ve SO os campos ja saneados
//        v
//   guard de saida .......... rejeita link, e-mail, telefone de terceiro e
//        v                    vazamento de instrucao
//   mensagem  ou  fallback deterministico
//
// A propriedade que importa: o texto escrito pelo lead nunca chega ao passo 2.
// Uma injecao consegue, no maximo, sujar um campo de 80 caracteres que ja foi
// higienizado — e a saida ainda passa pelo guard depois.

import {
  comporMensagem,
  extracaoVazia,
  primeiroNome,
  sanitizarExtracao,
  descreverInteresse,
  escolherPergunta,
  PERGUNTAS,
  type Extracao,
} from '../_shared/compose-message.ts';
import { LIMITES } from '../_shared/domain.ts';
import { verificarMensagem, type MotivoBloqueio } from '../_shared/output-guard.ts';
import { limparTexto } from '../_shared/validation.ts';
import {
  MODELO_EXTRACAO,
  MODELO_REDACAO,
  montarEntradaExtracao,
  montarEntradaRedacao,
  PROMPT_VERSAO,
  SYSTEM_EXTRACAO,
  SYSTEM_REDACAO,
} from '../_shared/prompt-first-message.v1.ts';

import { chamarClaude, ErroProvedor, lerJsonDoModelo } from '../_server/anthropic.ts';
import { exigirChaveDemo } from '../_server/demo-key.ts';
import { adminClient } from '../_server/env.ts';
import { handler, HttpError, json, lerJson } from '../_server/http.ts';

declare const Deno: { serve(fn: (req: Request) => Promise<Response>): void };

/**
 * Teto DIARIO e GLOBAL de chamadas.
 *
 * Global, e nao por IP, de proposito: `x-forwarded-for` e' influenciavel pelo
 * cliente e trocar de IP e' de graca, entao limite por IP da sensacao de
 * controle sem ser controle. O que realmente impede a conta de IA de virar um
 * cartao aberto na internet e' um teto absoluto — este — somado ao spend limit
 * configurado na propria chave, no console da Anthropic.
 *
 * O custo de estar errado e' aceitavel e conhecido: num dia de abuso a demo
 * para de gerar mensagem e passa a responder pelo fallback deterministico.
 */
const TETO_DIARIO = 200;

interface Veredito {
  veredito: 'ok' | 'bloqueado' | 'erro_provedor';
  motivo?: string;
}

async function chamadasHoje(): Promise<number> {
  const inicioDoDia = new Date();
  inicioDoDia.setUTCHours(0, 0, 0, 0);

  const { count, error } = await adminClient()
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', inicioDoDia.toISOString());

  if (error) {
    // Falhar o contador nao pode liberar geral: na duvida, trata como no teto.
    console.error('falha ao contar execucoes do agente:', error);
    return TETO_DIARIO;
  }
  return count ?? 0;
}

async function registrar(
  campos: Veredito & {
    leadId: string | null;
    modelo: string;
    latenciaMs: number;
    tokensEntrada: number;
    tokensSaida: number;
  },
): Promise<void> {
  const { error } = await adminClient().from('agent_runs').insert({
    lead_id: campos.leadId,
    modelo: campos.modelo,
    prompt_versao: PROMPT_VERSAO,
    veredito: campos.veredito,
    motivo: campos.motivo?.slice(0, 200) ?? null,
    latencia_ms: campos.latenciaMs,
    tokens_entrada: campos.tokensEntrada,
    tokens_saida: campos.tokensSaida,
  });
  // Registro e' observabilidade: se ele falhar, a mensagem ja' pronta nao pode
  // ser perdida por causa disso.
  if (error) console.error('falha ao registrar execucao do agente:', error);
}

interface Entrada {
  nome: string;
  imovelInteresse: string;
  telefone: string;
  leadId: string | null;
}

/**
 * Aceita duas formas: `{ lead_id }` (busca no banco) ou os campos soltos
 * (lead hipotetico — e' o que o botao de entrada hostil da tela usa, sem
 * precisar gravar lixo na base para demonstrar a defesa).
 */
async function lerEntrada(corpo: unknown): Promise<Entrada> {
  if (typeof corpo !== 'object' || corpo === null) {
    throw new HttpError(400, 'corpo inválido');
  }
  const c = corpo as Record<string, unknown>;

  if (typeof c.lead_id === 'string' && c.lead_id.length > 0) {
    const { data, error } = await adminClient()
      .from('leads')
      .select('id, nome, telefone, imovel_interesse')
      .eq('id', c.lead_id)
      .maybeSingle();

    if (error) {
      console.error('falha ao buscar lead:', error);
      throw new HttpError(500, 'não foi possível carregar o lead');
    }
    if (!data) throw new HttpError(404, 'lead não encontrado');

    return {
      nome: data.nome,
      imovelInteresse: data.imovel_interesse,
      telefone: data.telefone,
      leadId: data.id,
    };
  }

  const nome = limparTexto(typeof c.nome === 'string' ? c.nome : '');
  const imovel = limparTexto(typeof c.imovel_interesse === 'string' ? c.imovel_interesse : '');

  if (nome.length < LIMITES.nome.min || nome.length > LIMITES.nome.max) {
    throw new HttpError(400, 'dados inválidos', ['nome: obrigatório']);
  }
  if (
    imovel.length < LIMITES.imovelInteresse.min ||
    imovel.length > LIMITES.imovelInteresse.max
  ) {
    throw new HttpError(400, 'dados inválidos', ['imovel_interesse: obrigatório']);
  }

  return { nome, imovelInteresse: imovel, telefone: '', leadId: null };
}

/** Passo 1. Nunca lanca: falha de extracao vira extracao vazia, e o pipeline segue. */
async function extrair(
  imovelInteresse: string,
): Promise<{ extracao: Extracao; tokensEntrada: number; tokensSaida: number; falhou: boolean }> {
  try {
    const r = await chamarClaude({
      modelo: MODELO_EXTRACAO,
      system: SYSTEM_EXTRACAO,
      mensagem: montarEntradaExtracao(imovelInteresse),
      maxTokens: 400,
      temperature: 0,
    });
    return {
      // ⚠️ FRONTEIRA DE CONFIANCA. O que volta daqui e derivado de texto hostil.
      extracao: sanitizarExtracao(lerJsonDoModelo(r.texto)),
      tokensEntrada: r.tokensEntrada,
      tokensSaida: r.tokensSaida,
      falhou: false,
    };
  } catch (erro) {
    console.error('extracao falhou:', erro instanceof Error ? erro.message : erro);
    return { extracao: extracaoVazia(), tokensEntrada: 0, tokensSaida: 0, falhou: true };
  }
}

Deno.serve(
  handler(async (req) => {
    if (req.method !== 'POST') {
      throw new HttpError(405, `método ${req.method} não suportado`);
    }
    await exigirChaveDemo(req);

    const entrada = await lerEntrada(await lerJson(req));

    if ((await chamadasHoje()) >= TETO_DIARIO) {
      throw new HttpError(429, 'teto diário de gerações atingido; tente novamente amanhã');
    }

    const inicio = Date.now();
    let tokensEntrada = 0;
    let tokensSaida = 0;

    // --- passo 1 --------------------------------------------------------
    const extracao = await extrair(entrada.imovelInteresse);
    tokensEntrada += extracao.tokensEntrada;
    tokensSaida += extracao.tokensSaida;

    // A pergunta e a descricao saem de codigo puro, nao do modelo: e por isso
    // que a mensagem nao tem como inventar preco ou disponibilidade.
    const pergunta = escolherPergunta(extracao.extracao.falta_saber);
    const composta = comporMensagem(entrada.nome, extracao.extracao);

    // --- passo 2 --------------------------------------------------------
    let mensagem = composta.mensagem;
    let origem: 'modelo' | 'fallback' = 'fallback';
    let resultado: Veredito = extracao.falhou
      ? { veredito: 'erro_provedor', motivo: 'extração falhou' }
      : { veredito: 'ok' };
    let motivoGuard: MotivoBloqueio | null = null;
    // Qual passo quebrou — a tela precisa disto para nao marcar como "falhou"
    // um passo que nem chegou a rodar.
    let falha: 'extracao' | 'redacao' | null = extracao.falhou ? 'extracao' : null;

    if (!extracao.falhou) {
      try {
        const r = await chamarClaude({
          modelo: MODELO_REDACAO,
          system: SYSTEM_REDACAO,
          mensagem: montarEntradaRedacao({
            primeiroNome: primeiroNome(entrada.nome),
            interesse: descreverInteresse(extracao.extracao),
            pergunta: PERGUNTAS[pergunta],
          }),
          // Sem `temperature`: o Sonnet 5 rejeita o parametro com 400.
          // Sem thinking: redacao curta, sem ferramenta — raciocinio so'
          // gastaria o `max_tokens` e arriscaria cortar a mensagem.
          maxTokens: 800,
          semThinking: true,
        });
        tokensEntrada += r.tokensEntrada;
        tokensSaida += r.tokensSaida;

        // --- guard ------------------------------------------------------
        const guard = verificarMensagem(r.texto, entrada.telefone);
        if (guard.ok) {
          mensagem = r.texto;
          origem = 'modelo';
        } else {
          motivoGuard = guard.motivo ?? null;
          resultado = {
            veredito: 'bloqueado',
            motivo: `${guard.motivo}: ${guard.detalhe ?? ''}`.trim(),
          };
        }
      } catch (erro) {
        const detalhe = erro instanceof ErroProvedor ? erro.message : 'falha na redação';
        console.error('redacao falhou:', detalhe);
        resultado = { veredito: 'erro_provedor', motivo: detalhe };
        falha = 'redacao';
      }
    }

    const latenciaMs = Date.now() - inicio;

    await registrar({
      ...resultado,
      leadId: entrada.leadId,
      modelo: `${MODELO_EXTRACAO} + ${MODELO_REDACAO}`,
      latenciaMs,
      tokensEntrada,
      tokensSaida,
    });

    // A resposta expoe o PIPELINE INTEIRO, e nao so a mensagem: a tela mostra
    // o que foi extraido, qual pergunta foi escolhida e o veredito do guard.
    // Num projeto sobre agentes, o caminho e' parte do resultado.
    return json(
      {
        mensagem,
        origem,
        pergunta,
        extracao: extracao.extracao,
        guard: { bloqueou: motivoGuard !== null, motivo: motivoGuard },
        veredito: resultado.veredito,
        falha,
        latencia_ms: latenciaMs,
        prompt_versao: PROMPT_VERSAO,
      },
      200,
      req.headers.get('origin'),
    );
  }),
);
