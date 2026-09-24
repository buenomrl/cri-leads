import { describe, expect, it } from 'vitest';

import { iguaisEmTempoConstante } from './secure-compare.ts';

const CHAVE = 'Xk3v9QmT2pLr8sWd4hNb7cYe';

describe('iguaisEmTempoConstante', () => {
  it('aceita a chave certa', async () => {
    expect(await iguaisEmTempoConstante(CHAVE, CHAVE)).toBe(true);
  });

  it('recusa um caractere diferente, inclusive o ultimo', async () => {
    expect(await iguaisEmTempoConstante(CHAVE.slice(0, -1) + 'Z', CHAVE)).toBe(false);
    expect(await iguaisEmTempoConstante('y' + CHAVE.slice(1), CHAVE)).toBe(false);
  });

  it('recusa prefixo e extensao da chave certa', async () => {
    expect(await iguaisEmTempoConstante(CHAVE.slice(0, 10), CHAVE)).toBe(false);
    expect(await iguaisEmTempoConstante(CHAVE + 'a', CHAVE)).toBe(false);
  });

  it('recusa vazio contra chave, e diferenca so de caixa', async () => {
    expect(await iguaisEmTempoConstante('', CHAVE)).toBe(false);
    expect(await iguaisEmTempoConstante(CHAVE.toLowerCase(), CHAVE)).toBe(false);
  });

  it('funciona com acento e emoji (compara bytes UTF-8)', async () => {
    expect(await iguaisEmTempoConstante('chave-ção-🔑', 'chave-ção-🔑')).toBe(true);
    expect(await iguaisEmTempoConstante('chave-cao-🔑', 'chave-ção-🔑')).toBe(false);
  });
});
