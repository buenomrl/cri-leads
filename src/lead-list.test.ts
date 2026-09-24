import { describe, expect, it } from 'vitest';

import type { Lead } from '@shared/domain.ts';

import { buscarLeads, normalizar, ordenarLeads, proximaOrdem } from './lead-list.ts';

function lead(parcial: Partial<Lead> & Pick<Lead, 'nome'>): Lead {
  return {
    id: parcial.nome,
    telefone: '(11) 9****-**00',
    imovel_interesse: '',
    origem: 'site',
    status: 'novo',
    created_at: '2026-09-01T00:00:00.000Z',
    ...parcial,
  };
}

const LEADS: Lead[] = [
  lead({ nome: 'Thiago Monteiro', imovel_interesse: 'Apartamento garden em Moema, 3 suítes', origem: 'site', created_at: '2026-09-20T00:00:00.000Z', telefone: '(11) 9****-**47' }),
  lead({ nome: 'Ísis Andrade', imovel_interesse: 'Casa com piscina', origem: 'indicacao', status: 'qualificado', created_at: '2026-09-10T00:00:00.000Z', telefone: '(21) 9****-**12' }),
  lead({ nome: 'bruno Teles', imovel_interesse: 'Boa tarde', origem: 'whatsapp', status: 'perdido', created_at: '2026-09-15T00:00:00.000Z', telefone: '(11) 9****-**75' }),
];

const nomes = (leads: Lead[]) => leads.map((l) => l.nome);

describe('normalizar', () => {
  it('tira acento e caixa', () => {
    expect(normalizar('Imóvel INDICAÇÃO Ísis')).toBe('imovel indicacao isis');
  });
});

describe('buscarLeads', () => {
  it('termo vazio ou so espacos devolve tudo', () => {
    expect(buscarLeads(LEADS, '')).toHaveLength(3);
    expect(buscarLeads(LEADS, '   ')).toHaveLength(3);
  });

  it('ignora acento e caixa dos dois lados', () => {
    expect(nomes(buscarLeads(LEADS, 'SUITES'))).toEqual(['Thiago Monteiro']);
    expect(nomes(buscarLeads(LEADS, 'isis'))).toEqual(['Ísis Andrade']);
  });

  it('exige todas as palavras, em qualquer campo', () => {
    expect(nomes(buscarLeads(LEADS, 'moema suites'))).toEqual(['Thiago Monteiro']);
    expect(buscarLeads(LEADS, 'moema piscina')).toEqual([]);
  });

  it('acha pelo rotulo de origem e de status', () => {
    expect(nomes(buscarLeads(LEADS, 'indicacao'))).toEqual(['Ísis Andrade']);
    expect(nomes(buscarLeads(LEADS, 'whatsapp perdido'))).toEqual(['bruno Teles']);
  });

  it('acha pelo que o telefone mascarado mostra', () => {
    expect(nomes(buscarLeads(LEADS, '(21)'))).toEqual(['Ísis Andrade']);
    expect(nomes(buscarLeads(LEADS, '47'))).toEqual(['Thiago Monteiro']);
  });
});

describe('ordenarLeads', () => {
  it('sem ordem escolhida, mais recentes primeiro', () => {
    expect(nomes(ordenarLeads(LEADS, null))).toEqual(['Thiago Monteiro', 'bruno Teles', 'Ísis Andrade']);
  });

  it('nome em pt-BR: ignora caixa e acento', () => {
    expect(nomes(ordenarLeads(LEADS, { coluna: 'nome', direcao: 'asc' }))).toEqual([
      'bruno Teles',
      'Ísis Andrade',
      'Thiago Monteiro',
    ]);
    expect(nomes(ordenarLeads(LEADS, { coluna: 'nome', direcao: 'desc' }))).toEqual([
      'Thiago Monteiro',
      'Ísis Andrade',
      'bruno Teles',
    ]);
  });

  it('origem ordena pelo rotulo exibido', () => {
    expect(nomes(ordenarLeads(LEADS, { coluna: 'origem', direcao: 'asc' }))).toEqual([
      'Ísis Andrade', // Indicação
      'Thiago Monteiro', // Site
      'bruno Teles', // WhatsApp
    ]);
  });

  it('ordena telefone e imovel', () => {
    expect(nomes(ordenarLeads(LEADS, { coluna: 'telefone', direcao: 'asc' }))[2]).toBe('Ísis Andrade');
    expect(nomes(ordenarLeads(LEADS, { coluna: 'imovel_interesse', direcao: 'asc' }))[0]).toBe('Thiago Monteiro');
  });

  it('nao altera o array recebido', () => {
    const antes = nomes(LEADS);
    ordenarLeads(LEADS, { coluna: 'nome', direcao: 'asc' });
    expect(nomes(LEADS)).toEqual(antes);
  });
});

describe('proximaOrdem', () => {
  it('cicla asc -> desc -> padrao, e reinicia ao trocar de coluna', () => {
    const a = proximaOrdem(null, 'nome');
    expect(a).toEqual({ coluna: 'nome', direcao: 'asc' });
    const b = proximaOrdem(a, 'nome');
    expect(b).toEqual({ coluna: 'nome', direcao: 'desc' });
    expect(proximaOrdem(b, 'nome')).toBeNull();
    expect(proximaOrdem(b, 'origem')).toEqual({ coluna: 'origem', direcao: 'asc' });
  });
});
