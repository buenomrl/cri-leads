import { describe, expect, it } from 'vitest';

import type { Lead, Origem, Status } from './domain.ts';
import { resumoDeLeads, taxa, temDetalhe } from './analytics.ts';

let contador = 0;
function lead(origem: Origem, status: Status, imovel = 'Procuro imóvel'): Lead {
  contador += 1;
  return {
    id: `00000000-0000-4000-8000-${String(contador).padStart(12, '0')}`,
    nome: `Lead ${contador}`,
    telefone: '(11) 90114-2207',
    imovel_interesse: imovel,
    origem,
    status,
    created_at: '2026-09-01T12:00:00.000Z',
  };
}

function varios(n: number, origem: Origem, status: Status, imovel?: string): Lead[] {
  return Array.from({ length: n }, () => lead(origem, status, imovel));
}

describe('taxa', () => {
  it('arredonda para uma casa', () => {
    expect(taxa(2, 12)).toBe(16.7);
    expect(taxa(3, 5)).toBe(60);
  });

  it('devolve 0 em vez de NaN quando nao ha denominador', () => {
    expect(taxa(0, 0)).toBe(0);
  });
});

describe('temDetalhe', () => {
  it('considera detalhado o pedido que cita numero', () => {
    expect(temDetalhe('Apartamento 3 dormitórios no Itaim, até R$ 4,5 milhões')).toBe(true);
    expect(temDetalhe('Cobertura de 250 m²')).toBe(true);
  });

  it('considera vago o pedido sem numero nenhum', () => {
    expect(temDetalhe('Procuro apartamento em São Paulo')).toBe(false);
    expect(temDetalhe('Quero saber valores')).toBe(false);
  });
});

describe('resumoDeLeads', () => {
  // Mesma distribuicao do seed de 2026-09-24-02-seed-leads.sql. Se o seed
  // mudar, este teste e o analytics/resultados.md mudam junto — de proposito.
  const leads: Lead[] = [
    ...varios(2, 'site', 'qualificado'),
    ...varios(3, 'site', 'em_contato'),
    ...varios(3, 'site', 'perdido'),
    ...varios(4, 'site', 'novo'),
    ...varios(2, 'whatsapp', 'qualificado'),
    ...varios(3, 'whatsapp', 'em_contato'),
    ...varios(1, 'whatsapp', 'perdido'),
    ...varios(2, 'whatsapp', 'novo'),
    ...varios(3, 'indicacao', 'qualificado'),
    ...varios(1, 'indicacao', 'em_contato'),
    ...varios(1, 'indicacao', 'novo'),
  ];

  const r = resumoDeLeads(leads);

  it('conta o total e a distribuicao por status', () => {
    expect(r.total).toBe(25);
    expect(r.porStatus).toEqual({ novo: 7, em_contato: 7, qualificado: 7, perdido: 4 });
  });

  it('responde a pergunta 1 da Etapa 2: qual origem gerou mais leads', () => {
    expect(r.origemLider).toBe('site');
  });

  it('responde a pergunta 2 da Etapa 2: taxa de qualificacao por origem', () => {
    const porOrigem = Object.fromEntries(r.porOrigem.map((o) => [o.origem, o]));
    expect(porOrigem.site).toMatchObject({ total: 12, qualificados: 2, taxaQualificacao: 16.7 });
    expect(porOrigem.whatsapp).toMatchObject({ total: 8, qualificados: 2, taxaQualificacao: 25 });
    expect(porOrigem.indicacao).toMatchObject({ total: 5, qualificados: 3, taxaQualificacao: 60 });
  });

  it('a origem com mais volume tem a PIOR taxa — e o achado da Etapa 2', () => {
    const porOrigem = Object.fromEntries(r.porOrigem.map((o) => [o.origem, o]));
    expect(porOrigem.site.total).toBeGreaterThan(porOrigem.indicacao.total);
    expect(porOrigem.site.taxaQualificacao).toBeLessThan(porOrigem.indicacao.taxaQualificacao);
  });

  it('separa pedido detalhado de pedido vago', () => {
    const detalhado = 'Apartamento 3 dormitórios no Itaim';
    const vago = 'Quero informações';
    const amostra = [
      ...varios(3, 'site', 'qualificado', detalhado),
      ...varios(1, 'site', 'perdido', detalhado),
      ...varios(1, 'site', 'qualificado', vago),
      ...varios(5, 'site', 'perdido', vago),
    ];
    const resumo = resumoDeLeads(amostra);
    expect(resumo.porDetalhamento.comDetalhe).toEqual({
      total: 4,
      qualificados: 3,
      taxaQualificacao: 75,
    });
    expect(resumo.porDetalhamento.semDetalhe).toEqual({
      total: 6,
      qualificados: 1,
      taxaQualificacao: 16.7,
    });
  });

  it('nao quebra com lista vazia', () => {
    const vazio = resumoDeLeads([]);
    expect(vazio.total).toBe(0);
    expect(vazio.origemLider).toBeNull();
    expect(vazio.porOrigem.every((o) => o.taxaQualificacao === 0)).toBe(true);
  });
});
