// Validacao de entrada, escrita a mao.
//
// Por que nao Zod: esta camada roda em tres lugares (Deno das Edge Functions,
// navegador, Node do Vitest). Uma dependencia a menos e' um specifier a menos
// para conciliar entre os tres runtimes, e o que ela faria aqui cabe em umas
// poucas dezenas de linhas. A troca seria boa num schema grande; neste, nao.
//
// ⚠️ Os limites vem de LIMITES em domain.ts, que espelha os `check` da
// migracao. O SERVIDOR e' a autoridade: a tela valida igual so' para dar erro
// na hora, mas quem recusa de verdade e' esta funcao rodando na Edge Function,
// e, se ela falhar, o `check` do Postgres atras dela.

import { isOrigem, isStatus, LIMITES, type Origem, type Status } from './domain.ts';
import { removerInvisiveis } from './text.ts';

export type Validacao<T> = { ok: true; valor: T } | { ok: false; erros: string[] };

export interface NovoLead {
  nome: string;
  telefone: string;
  imovel_interesse: string;
  origem: Origem;
  status: Status;
}

export interface MudancaStatus {
  id: string;
  status: Status;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Normaliza texto que veio da rede: tira espaco das pontas, colapsa espaco
 * interno e remove caractere invisivel. Ver text.ts para por que o invisivel
 * e' questao de seguranca, e nao de higiene.
 */
export const limparTexto = removerInvisiveis;

function campoTexto(
  bruto: unknown,
  campo: string,
  limite: { min: number; max: number },
  erros: string[],
): string {
  if (typeof bruto !== 'string') {
    erros.push(`${campo}: obrigatório`);
    return '';
  }
  const limpo = limparTexto(bruto);
  if (limpo.length < limite.min) {
    erros.push(`${campo}: mínimo de ${limite.min} caracteres`);
  } else if (limpo.length > limite.max) {
    erros.push(`${campo}: máximo de ${limite.max} caracteres`);
  }
  return limpo;
}

export function validarNovoLead(entrada: unknown): Validacao<NovoLead> {
  const erros: string[] = [];

  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
    return { ok: false, erros: ['corpo: esperado um objeto JSON'] };
  }
  const e = entrada as Record<string, unknown>;

  const nome = campoTexto(e.nome, 'nome', LIMITES.nome, erros);
  const telefone = campoTexto(e.telefone, 'telefone', LIMITES.telefone, erros);
  const imovel = campoTexto(e.imovel_interesse, 'imovel_interesse', LIMITES.imovelInteresse, erros);

  // Telefone precisa ter digito suficiente para ser telefone — o limite de
  // tamanho sozinho aceitaria "aaaaaaaa".
  if (telefone && digitosMinimos(telefone) < 10) {
    erros.push('telefone: informe DDD e número');
  }

  if (!isOrigem(e.origem)) {
    erros.push('origem: valor inválido');
  }
  // Status e' opcional na criacao; o banco assume 'novo'.
  const status = e.status === undefined ? 'novo' : e.status;
  if (!isStatus(status)) {
    erros.push('status: valor inválido');
  }

  if (erros.length > 0) return { ok: false, erros };

  return {
    ok: true,
    valor: {
      nome,
      telefone,
      imovel_interesse: imovel,
      origem: e.origem as Origem,
      status: status as Status,
    },
  };
}

export function validarMudancaStatus(entrada: unknown): Validacao<MudancaStatus> {
  const erros: string[] = [];

  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) {
    return { ok: false, erros: ['corpo: esperado um objeto JSON'] };
  }
  const e = entrada as Record<string, unknown>;

  if (typeof e.id !== 'string' || !UUID_RE.test(e.id)) {
    erros.push('id: uuid inválido');
  }
  if (!isStatus(e.status)) {
    erros.push('status: valor inválido');
  }

  if (erros.length > 0) return { ok: false, erros };
  return { ok: true, valor: { id: e.id as string, status: e.status as Status } };
}

function digitosMinimos(telefone: string): number {
  return telefone.replace(/\D/g, '').length;
}
