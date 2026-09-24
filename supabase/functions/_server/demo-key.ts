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

import { iguaisEmTempoConstante } from '../_shared/secure-compare.ts';

import { env } from './env.ts';
import { HttpError } from './http.ts';

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
