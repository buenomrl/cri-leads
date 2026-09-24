// Cliente da API da Anthropic, em `fetch` puro.
//
// Sem SDK de proposito: a chamada e' um POST com tres cabecalhos, e uma
// dependencia a menos no edge runtime e' uma superficie a menos para revisar.
// Em troca, o formato do request fica explicito aqui — o que e' bom quando o
// assunto do projeto e' justamente o que entra e o que sai do modelo.

import { interpretarResposta } from '../_shared/model-response.ts';

import { env } from './env.ts';

const ENDPOINT = 'https://api.anthropic.com/v1/messages';
const VERSAO_API = '2023-06-01';

/** Chamada pendurada prende a function inteira. Corta antes do gateway cortar. */
const TIMEOUT_MS = 20_000;

export interface RespostaModelo {
  texto: string;
  tokensEntrada: number;
  tokensSaida: number;
}

export class ErroProvedor extends Error {}

export async function chamarClaude(opcoes: {
  modelo: string;
  system: string;
  mensagem: string;
  maxTokens: number;
  /**
   * So' para modelo que aceita amostragem. ⚠️ Sonnet 5 (e a familia Opus/Fable
   * atual) REJEITA `temperature` com 400 — por isso e' opcional e so' vai no
   * body quando definido. A extracao no Haiku usa 0: queremos o mesmo JSON sempre.
   */
  temperature?: number;
  /**
   * Desliga o raciocinio interno. No Sonnet 5 ele vem LIGADO por padrao e os
   * tokens dele contam dentro de `max_tokens` — numa redacao curta e sem
   * ferramenta, isso so' gasta token e arrisca cortar a mensagem.
   */
  semThinking?: boolean;
}): Promise<RespostaModelo> {
  const controle = new AbortController();
  const timer = setTimeout(() => controle.abort(), TIMEOUT_MS);

  try {
    const resposta = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env('ANTHROPIC_API_KEY'),
        'anthropic-version': VERSAO_API,
      },
      body: JSON.stringify({
        model: opcoes.modelo,
        max_tokens: opcoes.maxTokens,
        ...(opcoes.temperature !== undefined && { temperature: opcoes.temperature }),
        ...(opcoes.semThinking && { thinking: { type: 'disabled' } }),
        system: opcoes.system,
        messages: [{ role: 'user', content: opcoes.mensagem }],
      }),
      signal: controle.signal,
    });

    if (!resposta.ok) {
      const corpo = await resposta.text();
      // Loga para quem opera; o cliente recebe so' "erro_provedor" e cai no
      // fallback. Corpo de erro de provedor as vezes ecoa o request.
      console.error('anthropic respondeu', resposta.status, corpo.slice(0, 500));
      throw new ErroProvedor(`provedor respondeu ${resposta.status}`);
    }

    // O que conta como resposta valida (so' `end_turn`, so' blocos de texto)
    // e' regra pura e testada — ver _shared/model-response.ts.
    const lida = interpretarResposta(await resposta.json());
    if (!lida.ok) throw new ErroProvedor(lida.motivo);

    return { texto: lida.texto, tokensEntrada: lida.tokensEntrada, tokensSaida: lida.tokensSaida };
  } catch (erro) {
    if (erro instanceof ErroProvedor) throw erro;
    if (erro instanceof Error && erro.name === 'AbortError') {
      throw new ErroProvedor(`provedor não respondeu em ${TIMEOUT_MS} ms`);
    }
    throw new ErroProvedor(erro instanceof Error ? erro.message : 'falha ao chamar o provedor');
  } finally {
    clearTimeout(timer);
  }
}
