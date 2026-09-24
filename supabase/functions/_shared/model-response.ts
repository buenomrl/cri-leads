// Leitura da resposta da API da Anthropic.
//
// Separada de `_server/anthropic.ts` (que faz a chamada de rede) para que a
// DECISAO — o que conta como resposta valida — seja pura e testada. Foi aqui
// que o bug do Sonnet 5 ensinou a regra: so' `end_turn` e' resposta completa.

export type RespostaInterpretada =
  | { ok: true; texto: string; tokensEntrada: number; tokensSaida: number }
  | { ok: false; motivo: string };

/**
 * `max_tokens` e' texto cortado no meio; `refusal` e' o modelo declinando.
 * Os dois passariam pelo guard parecendo mensagem valida, entao viram falha e
 * o pipeline cai no fallback rotulado.
 *
 * So' blocos `type: 'text'` entram no texto: bloco de raciocinio (`thinking`)
 * nunca e' mensagem para o cliente.
 */
export function interpretarResposta(dados: unknown): RespostaInterpretada {
  const d = (typeof dados === 'object' && dados !== null ? dados : {}) as {
    stop_reason?: unknown;
    content?: unknown;
    usage?: { input_tokens?: unknown; output_tokens?: unknown };
  };

  if (d.stop_reason !== 'end_turn') {
    const valor = d.stop_reason === undefined ? 'ausente' : String(d.stop_reason);
    return { ok: false, motivo: `resposta incompleta (stop_reason: ${valor})` };
  }
  if (!Array.isArray(d.content)) {
    return { ok: false, motivo: 'resposta sem lista de conteúdo' };
  }

  const texto = d.content
    .filter((b): b is { type: 'text'; text?: unknown } => b?.type === 'text')
    .map((b) => (typeof b.text === 'string' ? b.text : ''))
    .join('')
    .trim();

  const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  return {
    ok: true,
    texto,
    tokensEntrada: numero(d.usage?.input_tokens),
    tokensSaida: numero(d.usage?.output_tokens),
  };
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
