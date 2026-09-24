import { describe, expect, it } from 'vitest';

import { digitosDoTelefone, mascararTelefone } from './phone.ts';

describe('mascararTelefone', () => {
  it('mascara celular mantendo DDD, o 9 e os dois ultimos digitos', () => {
    expect(mascararTelefone('(11) 90114-2207')).toBe('(11) 9****-**07');
  });

  it('funciona com o numero sem formatacao nenhuma', () => {
    expect(mascararTelefone('11901142207')).toBe('(11) 9****-**07');
  });

  it('mascara telefone fixo', () => {
    expect(mascararTelefone('(11) 3074-5522')).toBe('(11) ****-**22');
  });

  it('nao tenta adivinhar formato desconhecido, so preserva o fim', () => {
    expect(mascararTelefone('+351 912 345 678')).toBe('**********78');
  });

  it('entrada curta demais some por inteiro', () => {
    expect(mascararTelefone('123')).toMatch(/^\*+$/);
    expect(mascararTelefone('')).toBe('****');
  });

  // A mascara so presta se o numero inteiro NAO puder ser reconstruido.
  // No pior caso ficam visiveis DDD + o 9 + os dois ultimos: 5 de 11 digitos,
  // ou seja 6 digitos escondidos = um milhao de possibilidades.
  it('esconde pelo menos 6 digitos de um celular', () => {
    for (const t of ['(11) 90114-2207', '11987654321']) {
      const original = digitosDoTelefone(t);
      const visiveis = mascararTelefone(t).replace(/\D/g, '');
      expect(original.length - visiveis.length).toBeGreaterThanOrEqual(6);
    }
  });
});

describe('digitosDoTelefone', () => {
  it('reduz qualquer formatacao aos digitos', () => {
    expect(digitosDoTelefone('+55 (11) 90114-2207')).toBe('5511901142207');
  });
});
