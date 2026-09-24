// Acesso a segredo e ao banco. Este arquivo SO roda no Deno das Edge
// Functions — por isso `_server` e nao `_shared`, e por isso ele esta fora do
// tsconfig.json do front. Nada daqui pode ser importado pela tela: seria a
// forma mais direta de um segredo acabar dentro do bundle publico.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

declare const Deno: { env: { get(nome: string): string | undefined } };

export function env(nome: string): string {
  const valor = Deno.env.get(nome);
  if (!valor) {
    // Mensagem diz QUAL variavel falta, e nunca o valor de nenhuma.
    throw new Error(`variável de ambiente ausente: ${nome}`);
  }
  return valor;
}

export function envOpcional(nome: string, padrao = ''): string {
  return Deno.env.get(nome) ?? padrao;
}

/**
 * Cliente com `service_role`.
 *
 * ⚠️ Esta chave IGNORA a RLS. Ela e' injetada pelo runtime das Edge Functions
 * e nunca sai do servidor. E' justamente por ela existir aqui que o navegador
 * nao precisa de credencial nenhuma — e por isso nada em `_server` pode
 * atravessar para `src/`.
 */
export function adminClient(): SupabaseClient {
  return createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
