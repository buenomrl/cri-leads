import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LIMITES, ORIGENS, STATUSES } from './domain.ts';
import { limparTexto, validarMudancaStatus, validarNovoLead } from './validation.ts';

const leadValido = {
  nome: 'Ana Beatriz Salgado',
  telefone: '(11) 90114-2207',
  imovel_interesse: 'Apartamento 3 dormitórios no Itaim Bibi',
  origem: 'site',
};

describe('validarNovoLead', () => {
  it('aceita um lead completo e devolve o texto normalizado', () => {
    const r = validarNovoLead({ ...leadValido, nome: '  Ana   Beatriz  ' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.valor.nome).toBe('Ana Beatriz');
    expect(r.valor.status).toBe('novo');
  });

  it('recusa objeto que nao e objeto', () => {
    for (const entrada of [null, 'texto', 42, ['a'], undefined]) {
      expect(validarNovoLead(entrada).ok).toBe(false);
    }
  });

  it('recusa origem e status fora do dominio', () => {
    expect(validarNovoLead({ ...leadValido, origem: 'facebook' }).ok).toBe(false);
    expect(validarNovoLead({ ...leadValido, status: 'ganho' }).ok).toBe(false);
  });

  it('recusa telefone sem digito suficiente, mesmo com tamanho valido', () => {
    // "aaaaaaaaaa" passa no check de tamanho e nao e telefone nenhum.
    const r = validarNovoLead({ ...leadValido, telefone: 'aaaaaaaaaa' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros.join(' ')).toContain('telefone');
  });

  it('recusa texto acima do limite e acumula todos os erros de uma vez', () => {
    const r = validarNovoLead({
      nome: 'x',
      telefone: '1',
      imovel_interesse: 'a'.repeat(LIMITES.imovelInteresse.max + 1),
      origem: 'site',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    // Erro a erro seria uma ida e volta por campo para quem preenche o form.
    expect(r.erros.length).toBeGreaterThanOrEqual(3);
  });
});

describe('limparTexto', () => {
  it('remove caracteres de controle e invisiveis', () => {
    expect(limparTexto('Apartamento\u0000 no\u200B Itaim')).toBe('Apartamento no Itaim');
  });
});

describe('validarMudancaStatus', () => {
  it('exige uuid de verdade', () => {
    expect(validarMudancaStatus({ id: '123', status: 'qualificado' }).ok).toBe(false);
    expect(
      validarMudancaStatus({
        id: '4f1a2b3c-5d6e-4f7a-8b9c-0d1e2f3a4b5c',
        status: 'qualificado',
      }).ok,
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// O teste que existe por causa de uma licao, nao por cobertura
// ---------------------------------------------------------------------------
// O dominio esta escrito em DOIS lugares: nos literais de domain.ts e nos
// `check` da migracao. String contra string sempre compila, entao divergir
// aqui nao quebra build nenhum — quebra em producao, com a aplicacao aceitando
// um valor que o banco recusa (ou o contrario, deixando entrar lixo).
// So teste pega esta classe de erro.
describe('dominio do TypeScript espelha os check do SQL', () => {
  const sql = readFileSync(
    fileURLToPath(new URL('../../migrations/2026-09-24-01-create-leads.sql', import.meta.url)),
    'utf8',
  );

  it('todo valor de ORIGENS e STATUSES aparece no check correspondente', () => {
    const checkOrigem = /leads_origem_valida check \(origem in \(([^)]*)\)\)/.exec(sql)?.[1] ?? '';
    const checkStatus = /leads_status_valido check \(status in \(([^)]*)\)\)/.exec(sql)?.[1] ?? '';

    expect(checkOrigem).not.toBe('');
    expect(checkStatus).not.toBe('');

    for (const origem of ORIGENS) expect(checkOrigem).toContain(`'${origem}'`);
    for (const status of STATUSES) expect(checkStatus).toContain(`'${status}'`);

    // E o inverso: o SQL nao pode ter valor que o TypeScript desconhece.
    expect(checkOrigem.match(/'/g)?.length).toBe(ORIGENS.length * 2);
    expect(checkStatus.match(/'/g)?.length).toBe(STATUSES.length * 2);
  });

  it('os limites de tamanho batem com LIMITES', () => {
    expect(sql).toContain(`between ${LIMITES.nome.min} and ${LIMITES.nome.max}`);
    expect(sql).toContain(`between ${LIMITES.telefone.min} and ${LIMITES.telefone.max}`);
    expect(sql).toContain(
      `between ${LIMITES.imovelInteresse.min} and ${LIMITES.imovelInteresse.max}`,
    );
  });
});
