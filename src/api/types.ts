// Formas das respostas das 2 Edge Functions, do ponto de vista do front.
//
// ⚠️ Espelham os `json(...)` de supabase/functions/leads/index.ts e
// supabase/functions/agent-first-message/index.ts. Os tipos de dominio (Lead,
// Resumo, Extracao...) vem de @shared, entao so' o envelope mora aqui.

import type { Resumo } from '@shared/analytics.ts';
import type { Extracao, FaltaSaber } from '@shared/compose-message.ts';
import type { Lead, Status } from '@shared/domain.ts';
import type { MotivoBloqueio } from '@shared/output-guard.ts';
import type { NovoLead } from '@shared/validation.ts';

export interface ListaResposta {
  leads: Lead[];
  resumo: Resumo;
}

export interface RespostaAgente {
  mensagem: string;
  /** `fallback` = mensagem montada por codigo puro, sem o modelo. */
  origem: 'modelo' | 'fallback';
  pergunta: FaltaSaber;
  extracao: Extracao;
  guard: { bloqueou: boolean; motivo: MotivoBloqueio | null };
  veredito: 'ok' | 'bloqueado' | 'erro_provedor';
  /** Qual passo quebrou quando `veredito` e' `erro_provedor`; senao `null`. */
  falha: 'extracao' | 'redacao' | null;
  latencia_ms: number;
  prompt_versao: string;
}

/** Lead salvo (`lead_id`) ou lead hipotetico — o teste de entrada hostil usa o segundo. */
export type EntradaAgente = { lead_id: string } | { nome: string; imovel_interesse: string };

export interface Api {
  listar(): Promise<ListaResposta>;
  criar(novo: NovoLead, chave: string): Promise<Lead>;
  mudarStatus(id: string, status: Status, chave: string): Promise<Lead>;
  gerarMensagem(entrada: EntradaAgente, chave: string): Promise<RespostaAgente>;
}

/** Erro como a API o devolve: `{ erro, detalhes? }` com o status HTTP. */
export class ErroApi extends Error {
  readonly status: number;
  readonly detalhes: string[];

  constructor(status: number, mensagem: string, detalhes: string[] = []) {
    super(mensagem);
    this.status = status;
    this.detalhes = detalhes;
  }
}
