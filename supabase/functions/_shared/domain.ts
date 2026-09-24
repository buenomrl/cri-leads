// Vocabulario de dominio. Vem do enunciado do case em portugues, entao os
// VALORES sao em portugues — mudar isso so' criaria uma traducao a mais entre
// o banco, a tela e a conversa com quem avalia.
//
// ⚠️ Estes literais espelham os `check` de 2026-09-24-01-create-leads.sql.
// Se um dos lados mudar sem o outro, a aplicacao aceita valor que o banco
// recusa (ou o contrario). Um teste em validation.test.ts trava isso.

export const ORIGENS = ['site', 'whatsapp', 'indicacao'] as const;
export type Origem = (typeof ORIGENS)[number];

export const STATUSES = ['novo', 'em_contato', 'qualificado', 'perdido'] as const;
export type Status = (typeof STATUSES)[number];

// Limites espelhados dos `check` de tamanho da mesma migracao.
export const LIMITES = {
  nome: { min: 2, max: 120 },
  telefone: { min: 8, max: 20 },
  imovelInteresse: { min: 3, max: 1000 },
} as const;

export const ORIGEM_LABEL: Record<Origem, string> = {
  site: 'Site',
  whatsapp: 'WhatsApp',
  indicacao: 'Indicação',
};

export const STATUS_LABEL: Record<Status, string> = {
  novo: 'Novo',
  em_contato: 'Em contato',
  qualificado: 'Qualificado',
  perdido: 'Perdido',
};

/** Ordem do funil, usada na tela e nos resumos. Nao e' alfabetica de proposito. */
export const STATUS_ORDEM: readonly Status[] = ['novo', 'em_contato', 'qualificado', 'perdido'];

export interface Lead {
  id: string;
  nome: string;
  /** Mascarado nas respostas de listagem. Ver phone.ts. */
  telefone: string;
  imovel_interesse: string;
  origem: Origem;
  status: Status;
  created_at: string;
}

export function isOrigem(valor: unknown): valor is Origem {
  return typeof valor === 'string' && (ORIGENS as readonly string[]).includes(valor);
}

export function isStatus(valor: unknown): valor is Status {
  return typeof valor === 'string' && (STATUSES as readonly string[]).includes(valor);
}
