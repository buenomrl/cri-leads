// Etapa 1 + 3 · a rota de leads.
//
//   GET    -> lista os leads (telefone MASCARADO) + o resumo da Etapa 2
//   POST   -> cria lead            (exige chave de demo)
//   PATCH  -> muda status do lead  (exige chave de demo)
//
// Uma function so, e nao quatro: o gateway, o CORS e a checagem de chave sao
// os mesmos nos tres verbos, e cada function separada seria mais uma copia
// disso para manter em sincronia.
//
// Nao existe DELETE, em nenhuma camada: nem aqui, nem no GRANT, nem em policy.
// Lead perdido vira status 'perdido'; historico comercial nao se apaga.

import { resumoDeLeads } from '../_shared/analytics.ts';
import type { Lead } from '../_shared/domain.ts';
import { mascararTelefone } from '../_shared/phone.ts';
import { validarMudancaStatus, validarNovoLead } from '../_shared/validation.ts';

import { exigirChaveDemo } from '../_server/demo-key.ts';
import { adminClient } from '../_server/env.ts';
import { handler, HttpError, json, lerJson } from '../_server/http.ts';

declare const Deno: { serve(fn: (req: Request) => Promise<Response>): void };

const COLUNAS = 'id, nome, telefone, imovel_interesse, origem, status, created_at';

/**
 * ⚠️ O resumo e' calculado sobre os leads CRUS, antes da mascara — e a mascara
 * e' aplicada so na saida. Inverter a ordem nao mudaria numero nenhum hoje,
 * mas deixaria a agregacao dependendo de um campo ja' destruido, que e' o tipo
 * de acoplamento que quebra na primeira metrica nova.
 */
function paraSaida(lead: Lead): Lead {
  return { ...lead, telefone: mascararTelefone(lead.telefone) };
}

async function listar(req: Request): Promise<Response> {
  const { data, error } = await adminClient()
    .from('leads')
    .select(COLUNAS)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('falha ao listar leads:', error);
    throw new HttpError(500, 'não foi possível carregar os leads');
  }

  const leads = (data ?? []) as Lead[];
  return json(
    { leads: leads.map(paraSaida), resumo: resumoDeLeads(leads) },
    200,
    req.headers.get('origin'),
  );
}

async function criar(req: Request): Promise<Response> {
  await exigirChaveDemo(req);

  const validacao = validarNovoLead(await lerJson(req));
  if (!validacao.ok) {
    throw new HttpError(400, 'dados inválidos', validacao.erros);
  }

  const { data, error } = await adminClient()
    .from('leads')
    .insert(validacao.valor)
    .select(COLUNAS)
    .single();

  if (error) {
    console.error('falha ao criar lead:', error);
    throw new HttpError(500, 'não foi possível salvar o lead');
  }

  return json({ lead: paraSaida(data as Lead) }, 201, req.headers.get('origin'));
}

async function mudarStatus(req: Request): Promise<Response> {
  await exigirChaveDemo(req);

  const validacao = validarMudancaStatus(await lerJson(req));
  if (!validacao.ok) {
    throw new HttpError(400, 'dados inválidos', validacao.erros);
  }

  const { data, error } = await adminClient()
    .from('leads')
    .update({ status: validacao.valor.status })
    .eq('id', validacao.valor.id)
    .select(COLUNAS)
    .maybeSingle();

  if (error) {
    console.error('falha ao mudar status:', error);
    throw new HttpError(500, 'não foi possível atualizar o lead');
  }
  if (!data) {
    throw new HttpError(404, 'lead não encontrado');
  }

  return json({ lead: paraSaida(data as Lead) }, 200, req.headers.get('origin'));
}

Deno.serve(
  handler(async (req) => {
    switch (req.method) {
      case 'GET':
        return listar(req);
      case 'POST':
        return criar(req);
      case 'PATCH':
        return mudarStatus(req);
      default:
        throw new HttpError(405, `método ${req.method} não suportado`);
    }
  }),
);
