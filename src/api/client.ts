// O UNICO ponto do front que sabe onde a API mora e que manda a chave de demo.
//
// Nao existe cliente do Supabase aqui, nem chave do Supabase: o navegador fala
// so' com as 2 Edge Functions. Ver SECURITY.md.

import type { Lead, Status } from '@shared/domain.ts';
import type { NovoLead } from '@shared/validation.ts';

import { ErroApi, type Api, type EntradaAgente, type ListaResposta, type RespostaAgente } from './types.ts';

const BASE = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '');

/**
 * Modo local: em desenvolvimento, sem URL configurada, o front roda contra uma
 * API em memoria (demo-local.ts). A condicao fica INLINE no `if` de `obterApi`
 * de proposito: no build de producao `import.meta.env.DEV` vira `false`, o
 * bundler corta o ramo inteiro e o modulo local nem entra no bundle publicado.
 */
export const MODO_LOCAL = import.meta.env.DEV && BASE === '';

async function chamar<T>(caminho: string, init: RequestInit, chave?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers['content-type'] = 'application/json';
  // A chave so' viaja em header — nunca em URL, onde acabaria em log e historico.
  if (chave) headers['x-demo-key'] = chave;

  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/${caminho}`, { ...init, headers });
  } catch {
    throw new ErroApi(0, 'Sem conexão com a API.');
  }

  const corpo: unknown = await resposta.json().catch(() => null);
  if (!resposta.ok) {
    const c = (corpo ?? {}) as { erro?: unknown; detalhes?: unknown };
    throw new ErroApi(
      resposta.status,
      typeof c.erro === 'string' ? c.erro : `Erro ${resposta.status}.`,
      Array.isArray(c.detalhes) ? c.detalhes.filter((d): d is string => typeof d === 'string') : [],
    );
  }
  return corpo as T;
}

const apiRemota: Api = {
  listar: () => chamar<ListaResposta>('leads', { method: 'GET' }),

  criar: async (novo: NovoLead, chave: string) =>
    (await chamar<{ lead: Lead }>('leads', { method: 'POST', body: JSON.stringify(novo) }, chave)).lead,

  mudarStatus: async (id: string, status: Status, chave: string) =>
    (
      await chamar<{ lead: Lead }>(
        'leads',
        { method: 'PATCH', body: JSON.stringify({ id, status }) },
        chave,
      )
    ).lead,

  gerarMensagem: (entrada: EntradaAgente, chave: string) =>
    chamar<RespostaAgente>(
      'agent-first-message',
      { method: 'POST', body: JSON.stringify(entrada) },
      chave,
    ),
};

let api: Promise<Api> | null = null;

export function obterApi(): Promise<Api> {
  if (api) return api;

  if (import.meta.env.DEV && BASE === '') {
    api = import('./demo-local.ts').then((m) => m.apiLocal);
  } else if (BASE === '') {
    api = Promise.reject(new ErroApi(0, 'VITE_API_BASE_URL não configurada neste build.'));
  } else {
    api = Promise.resolve(apiRemota);
  }
  return api;
}
