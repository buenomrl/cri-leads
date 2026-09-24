// Resposta HTTP, CORS e tratamento de erro — o invólucro comum das 2 rotas.

import { envOpcional } from './env.ts';

export class HttpError extends Error {
  readonly status: number;
  readonly detalhes?: string[];

  constructor(status: number, mensagem: string, detalhes?: string[]) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// ⚠️ CORS E' HIGIENE, NAO CONTROLE DE ACESSO.
//
// Ele impede que OUTRO site no navegador de alguem leia a resposta destas
// rotas. Ele nao impede absolutamente nada vindo de curl, Postman ou qualquer
// script — esses ignoram CORS porque CORS e' regra que o navegador aplica em
// si mesmo. Quem controla escrita aqui e' a chave de demo. Ver SECURITY.md.

function origensPermitidas(): string[] {
  return envOpcional('ALLOWED_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export function corsHeaders(origem: string | null): Record<string, string> {
  const permitidas = origensPermitidas();
  const liberada = origem && permitidas.includes(origem) ? origem : permitidas[0] ?? '';

  return {
    'Access-Control-Allow-Origin': liberada,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, x-demo-key',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

// ---------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------

export function json(corpo: unknown, status: number, origem: string | null): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: {
      ...corsHeaders(origem),
      'content-type': 'application/json; charset=utf-8',
      // Resposta de API nao entra em cache de intermediario.
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff',
    },
  });
}

/**
 * Embrulha o handler: responde o preflight, converte HttpError em resposta e
 * — o que importa — impede que um erro inesperado vire vazamento.
 *
 * Erro nao previsto sempre sai como 500 generico. Stack trace, mensagem do
 * Postgres e nome de coluna ficam no log do servidor, nunca no corpo: mensagem
 * de erro detalhada e' material de reconhecimento para quem sonda a API.
 */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const origem = req.headers.get('origin');

    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origem) });
    }

    try {
      return await fn(req);
    } catch (erro) {
      if (erro instanceof HttpError) {
        return json({ erro: erro.message, detalhes: erro.detalhes }, erro.status, origem);
      }
      console.error('erro inesperado:', erro);
      return json({ erro: 'erro interno' }, 500, origem);
    }
  };
}

export async function lerJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, 'corpo inválido: esperado JSON');
  }
}
