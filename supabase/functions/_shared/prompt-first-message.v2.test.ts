import { describe, expect, it } from 'vitest';

import * as v1 from './prompt-first-message.v1.ts';
import * as v2 from './prompt-first-message.v2.ts';

describe('prompt v2', () => {
  it('e uma versao nova, gravada em agent_runs', () => {
    expect(v2.PROMPT_VERSAO).toBe('first-message.v2');
    expect(v1.PROMPT_VERSAO).toBe('first-message.v1');
  });

  it('mantem a regra de seguranca e a tag de dados da v1', () => {
    expect(v2.SYSTEM_EXTRACAO).toContain('<dados_do_lead></dados_do_lead>');
    expect(v2.SYSTEM_EXTRACAO).toContain('REGRA DE SEGURANÇA');
  });

  it('conta orcamento sem numero como sinal de orcamento (o caso achado pela avaliacao)', () => {
    expect(v2.SYSTEM_EXTRACAO).toContain('orçamento aberto');
    expect(v1.SYSTEM_EXTRACAO).not.toContain('orçamento aberto');
  });

  it('so a extracao mudou: redacao e montagem da entrada sao as mesmas da v1', () => {
    expect(v2.SYSTEM_REDACAO).toBe(v1.SYSTEM_REDACAO);
    expect(v2.montarEntradaExtracao('casa')).toBe(v1.montarEntradaExtracao('casa'));
    expect(v2.MODELO_EXTRACAO).toBe(v1.MODELO_EXTRACAO);
    expect(v2.MODELO_REDACAO).toBe(v1.MODELO_REDACAO);
  });
});
