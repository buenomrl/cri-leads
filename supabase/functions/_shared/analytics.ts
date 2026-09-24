// Agregacao da Etapa 2.
//
// Esta e' a UNICA implementacao dos numeros do projeto: a Edge Function a usa
// para montar o resumo que devolve, a tela mostra o que veio dela, e o Vitest
// testa esta funcao. Nao existe um "calculo da tela" e um "calculo da API"
// podendo divergir.
//
// ⚠️ As consultas em analytics/*.sql calculam os MESMOS numeros em SQL, de
// proposito: o enunciado pede a consulta usada, e ter os dois lados permite
// conferir um contra o outro. Se divergirem, um dos dois esta' errado.

import { ORIGENS, STATUSES, type Lead, type Origem, type Status } from './domain.ts';

export interface RecorteQualificacao {
  total: number;
  qualificados: number;
  /** Percentual 0–100, uma casa decimal. */
  taxaQualificacao: number;
}

export interface ResumoOrigem extends RecorteQualificacao {
  origem: Origem;
}

export interface Resumo {
  total: number;
  porStatus: Record<Status, number>;
  porOrigem: ResumoOrigem[];
  /** Origem com mais leads. `null` se nao ha' lead. Empate: a primeira em ORIGENS. */
  origemLider: Origem | null;
  /**
   * O segundo padrao da Etapa 2: lead que descreveu o que quer com algum numero
   * (metragem, dormitorios, faixa de preco) contra lead que so' disse "quero
   * informacoes". Ver analytics/resultados.md.
   */
  porDetalhamento: {
    comDetalhe: RecorteQualificacao;
    semDetalhe: RecorteQualificacao;
  };
}

/**
 * Regra de "pedido detalhado": o texto cita algum numero.
 *
 * E' grosseira de proposito — e' um proxy observavel, nao uma classificacao
 * semantica. Vale porque em imovel praticamente todo detalhe que qualifica
 * (metragem, dormitorios, faixa de preco, andar) vem com numero, e porque
 * pode ser reproduzida identica em SQL, que e' o que o enunciado pede ver.
 *
 * ⚠️ Espelha `imovel_interesse ~ '[0-9]'` em analytics/03-detalhe-vs-qualificacao.sql.
 */
export function temDetalhe(imovelInteresse: string): boolean {
  return /[0-9]/.test(imovelInteresse);
}

/** Percentual 0–100 com uma casa. Total zero devolve 0, nao NaN. */
export function taxa(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}

function recorte(leads: Lead[]): RecorteQualificacao {
  const qualificados = leads.filter((l) => l.status === 'qualificado').length;
  return { total: leads.length, qualificados, taxaQualificacao: taxa(qualificados, leads.length) };
}

export function resumoDeLeads(leads: Lead[]): Resumo {
  const porStatus = Object.fromEntries(
    STATUSES.map((s) => [s, leads.filter((l) => l.status === s).length]),
  ) as Record<Status, number>;

  const porOrigem: ResumoOrigem[] = ORIGENS.map((origem) => ({
    origem,
    ...recorte(leads.filter((l) => l.origem === origem)),
  }));

  // Empate resolve pela ordem de ORIGENS — determinismo importa porque este
  // numero aparece na tela e no documento da Etapa 2.
  const lider = porOrigem.reduce<ResumoOrigem | null>(
    (maior, atual) => (maior === null || atual.total > maior.total ? atual : maior),
    null,
  );

  return {
    total: leads.length,
    porStatus,
    porOrigem,
    origemLider: lider && lider.total > 0 ? lider.origem : null,
    porDetalhamento: {
      comDetalhe: recorte(leads.filter((l) => temDetalhe(l.imovel_interesse))),
      semDetalhe: recorte(leads.filter((l) => !temDetalhe(l.imovel_interesse))),
    },
  };
}
