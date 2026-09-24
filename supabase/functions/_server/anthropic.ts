// Cliente da API da Anthropic, em `fetch` puro.
//
// Sem SDK de proposito: a chamada e' um POST com tres cabecalhos, e uma
// dependencia a menos no edge runtime e' uma superficie a menos para revisar.
// Em troca, o formato do request fica explicito aqui — o que e' bom quando o
// assunto do projeto e' justamente o que entra e o que sai do modelo.

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

    const dados = await resposta.json();

    // So' `end_turn` e' resposta completa. `max_tokens` e' texto cortado no
    // meio e `refusal` e' o modelo declinando — os dois passariam pelo guard
    // parecendo mensagem valida, entao viram erro e o pipeline cai no fallback.
    if (dados?.stop_reason !== 'end_turn') {
      throw new ErroProvedor(`resposta incompleta (stop_reason: ${dados?.stop_reason ?? 'ausente'})`);
    }

    const texto = (dados?.content ?? [])
      .filter((bloco: { type?: string }) => bloco?.type === 'text')
      .map((bloco: { text?: string }) => bloco.text ?? '')
      .join('')
      .trim();

    return {
      texto,
      tokensEntrada: dados?.usage?.input_tokens ?? 0,
      tokensSaida: dados?.usage?.output_tokens ?? 0,
    };
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

/**
 * Le JSON que veio do modelo.
 *
 * O prompt pede JSON puro, mas modelo as vezes embrulha em cerca de codigo ou
 * acrescenta uma frase. Em vez de confiar, recorta do primeiro `{` ao ultimo
 * `}`. Se ainda assim nao for JSON, devolve null e quem chamou decide — nunca
 * lanca, porque falha de parse aqui tem de virar fallback, nao erro 500.
 */
export function lerJsonDoModelo(texto: string): unknown {
  const inicio = texto.indexOf('{');
  const fim = texto.lastIndexOf('}');
  if (inicio === -1 || fim <= inicio) return null;
  try {
    return JSON.parse(texto.slice(inicio, fim + 1));
  } catch {
    return null;
  }
}
