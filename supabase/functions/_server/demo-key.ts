// A chave que libera os caminhos de ESCRITA.
//
// ⚠️ ISTO NAO E' AUTENTICACAO, e o documento da entrega diz isso com estas
// palavras. E' UMA credencial compartilhada, igual para todo mundo, sem
// identidade, sem expiracao e sem revogacao individual. Nao da para saber quem
// usou, so que alguem que a tinha usou.
//
// Por que existe assim: o enunciado dispensa login, e a interface publicada
// precisa funcionar para quem avalia sem cadastro nenhum. Entao a leitura e'
// aberta e a escrita fica atras de uma chave que vai no e-mail da entrega.
// Sem isso, qualquer um que achasse a URL poderia poluir a base durante a
// avaliacao, virar status e gastar credito de IA.
//
// O que existiria em producao, no lugar disto: Supabase Auth, papel por
// usuario, RLS por imobiliaria (as policies ja estao escritas na migracao 01)
// e registro de quem alterou o quê.

import { env } from './env.ts';
import { HttpError } from './http.ts';

async function sha256(valor: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(valor);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

/**
 * Comparacao em tempo constante.
 *
 * Compara o HASH das duas chaves, e nao as chaves: alem de eliminar o retorno
 * antecipado no primeiro byte diferente, iguala o comprimento dos operandos —
 * comparar strings cruas vazaria o TAMANHO da chave certa pela diferenca de
 * tempo entre um palpite curto e um longo.
 */
async function iguaisEmTempoConstante(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diferenca = 0;
  for (let i = 0; i < ha.length; i += 1) diferenca |= ha[i] ^ hb[i];
  return diferenca === 0;
}

/** Lanca 401 se a requisicao nao trouxer a chave de escrita correta. */
export async function exigirChaveDemo(req: Request): Promise<void> {
  const fornecida = req.headers.get('x-demo-key') ?? '';
  if (fornecida.length === 0) {
    throw new HttpError(401, 'esta ação precisa da chave de demonstração');
  }
  if (!(await iguaisEmTempoConstante(fornecida, env('DEMO_WRITE_KEY')))) {
    // Mesma mensagem do caso sem chave: distinguir "faltou" de "errou" so
    // ajudaria quem esta tentando adivinhar.
    throw new HttpError(401, 'esta ação precisa da chave de demonstração');
  }
}
