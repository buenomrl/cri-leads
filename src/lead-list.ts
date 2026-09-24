// Busca e ordenacao da tabela de leads.
//
// Regra pura, fora do componente, para ter onde o teste morder. A lista ja'
// chega inteira do `GET /leads`, entao isto roda so' no navegador — nao ha'
// consulta nova ao banco.

import { ORIGEM_LABEL, STATUS_LABEL, type Lead } from '@shared/domain.ts';

export type ColunaOrdenavel = 'nome' | 'telefone' | 'imovel_interesse' | 'origem';
export type Ordem = { coluna: ColunaOrdenavel; direcao: 'asc' | 'desc' } | null;

/**
 * Minusculas e sem acento, para "imovel" achar "Imóvel" e "indicacao" achar
 * "Indicação". `\p{M}` (marcas combinantes) em vez de uma faixa de escapes:
 * depois do NFD, todo acento vira uma marca separada da letra.
 */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Termo vazio devolve tudo. Com varias palavras, TODAS precisam aparecer em
 * algum campo — "moema suites" acha quem pediu suites em Moema.
 *
 * Telefone: a lista publica so' tem o numero MASCARADO ("(11) 9****-**47"),
 * entao a busca so' casa com o que esta' visivel (DDD e os 2 ultimos digitos).
 * Consequencia da mascara, que e' proposital — ver phone.ts.
 */
export function buscarLeads(leads: readonly Lead[], termo: string): Lead[] {
  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return [...leads];

  return leads.filter((lead) => {
    const texto = normalizar(
      [
        lead.nome,
        lead.imovel_interesse,
        ORIGEM_LABEL[lead.origem],
        STATUS_LABEL[lead.status],
        lead.telefone,
      ].join(' '),
    );
    return palavras.every((p) => texto.includes(p));
  });
}

function valorDaColuna(lead: Lead, coluna: ColunaOrdenavel): string {
  // Origem ordena pelo rotulo que aparece na tela, nao pelo valor do banco.
  return coluna === 'origem' ? ORIGEM_LABEL[lead.origem] : lead[coluna];
}

const COMPARADOR = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });

/** `null` = padrao: mais recentes primeiro. Nunca altera o array recebido. */
export function ordenarLeads(leads: readonly Lead[], ordem: Ordem): Lead[] {
  const copia = [...leads];
  if (ordem === null) {
    return copia.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const sinal = ordem.direcao === 'asc' ? 1 : -1;
  return copia.sort(
    (a, b) => sinal * COMPARADOR.compare(valorDaColuna(a, ordem.coluna), valorDaColuna(b, ordem.coluna)),
  );
}

/** Ciclo do clique no cabecalho: asc -> desc -> volta ao padrao. */
export function proximaOrdem(atual: Ordem, coluna: ColunaOrdenavel): Ordem {
  if (atual?.coluna !== coluna) return { coluna, direcao: 'asc' };
  return atual.direcao === 'asc' ? { coluna, direcao: 'desc' } : null;
}
