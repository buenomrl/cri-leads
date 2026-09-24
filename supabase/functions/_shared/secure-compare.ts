// Comparacao de segredo em tempo constante.
//
// Mora em `_shared` (e nao em `_server/demo-key.ts`, que a usa) para poder ser
// testada: usa so' `crypto.subtle`, que existe igual no Deno, no navegador e no
// Node — nenhuma env, nenhum import de runtime.

async function sha256(valor: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(valor);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

/**
 * Compara o HASH das duas strings, e nao as strings: alem de eliminar o
 * retorno antecipado no primeiro byte diferente, iguala o comprimento dos
 * operandos — comparar strings cruas vazaria o TAMANHO da chave certa pela
 * diferenca de tempo entre um palpite curto e um longo.
 */
export async function iguaisEmTempoConstante(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diferenca = 0;
  for (let i = 0; i < ha.length; i += 1) diferenca |= ha[i] ^ hb[i];
  return diferenca === 0;
}
