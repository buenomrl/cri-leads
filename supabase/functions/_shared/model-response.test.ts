import { describe, expect, it } from 'vitest';

import { interpretarResposta, lerJsonDoModelo } from './model-response.ts';

const resposta = (extra: Record<string, unknown>) => ({
  content: [{ type: 'text', text: 'Olá, Ana! Tudo certo.' }],
  usage: { input_tokens: 120, output_tokens: 40 },
  stop_reason: 'end_turn',
  ...extra,
});

describe('interpretarResposta', () => {
  it('end_turn: devolve texto e tokens', () => {
    expect(interpretarResposta(resposta({}))).toEqual({
      ok: true,
      texto: 'Olá, Ana! Tudo certo.',
      tokensEntrada: 120,
      tokensSaida: 40,
    });
  });

  it('max_tokens e resposta cortada: falha, nunca vira mensagem', () => {
    const r = interpretarResposta(resposta({ stop_reason: 'max_tokens' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain('max_tokens');
  });

  it('refusal: falha', () => {
    expect(interpretarResposta(resposta({ stop_reason: 'refusal' })).ok).toBe(false);
  });

  it('stop_reason ausente ou corpo que nao e objeto: falha', () => {
    const r = interpretarResposta({ content: [{ type: 'text', text: 'oi' }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.motivo).toContain('ausente');
    expect(interpretarResposta(null).ok).toBe(false);
    expect(interpretarResposta('texto').ok).toBe(false);
  });

  it('ignora bloco de raciocinio: so texto vai para o cliente', () => {
    const r = interpretarResposta(
      resposta({
        content: [
          { type: 'thinking', thinking: 'raciocinio interno' },
          { type: 'text', text: 'Parte 1. ' },
          { type: 'text', text: 'Parte 2.' },
        ],
      }),
    );
    expect(r.ok && r.texto).toBe('Parte 1. Parte 2.');
  });

  it('content ausente ou que nao e lista: falha com motivo proprio', () => {
    const semConteudo = interpretarResposta({ stop_reason: 'end_turn' });
    expect(semConteudo.ok).toBe(false);
    if (!semConteudo.ok) expect(semConteudo.motivo).toContain('conteúdo');
    expect(interpretarResposta(resposta({ content: 'texto solto' })).ok).toBe(false);
  });

  it('stop_reason estranho aparece no motivo como veio', () => {
    const r = interpretarResposta(resposta({ stop_reason: 42 }));
    expect(!r.ok && r.motivo).toContain('42');
  });

  it('bloco de texto sem string vira vazio, sem quebrar', () => {
    const r = interpretarResposta(resposta({ content: [{ type: 'text', text: 7 }, { type: 'text', text: 'ok' }] }));
    expect(r.ok && r.texto).toBe('ok');
  });

  it('usage ausente ou estranho vira zero, sem quebrar', () => {
    const r = interpretarResposta(resposta({ usage: { input_tokens: 'muitos' } }));
    expect(r.ok && [r.tokensEntrada, r.tokensSaida]).toEqual([0, 0]);
  });
});

describe('lerJsonDoModelo', () => {
  it('JSON puro', () => {
    expect(lerJsonDoModelo('{"bairro":"Itaim"}')).toEqual({ bairro: 'Itaim' });
  });

  it('JSON dentro de cerca de codigo ou com frase em volta', () => {
    expect(lerJsonDoModelo('```json\n{"dormitorios":3}\n```')).toEqual({ dormitorios: 3 });
    expect(lerJsonDoModelo('Aqui esta: {"intencao":"compra"} espero ter ajudado')).toEqual({
      intencao: 'compra',
    });
  });

  it('sem JSON valido devolve null, nunca lanca', () => {
    expect(lerJsonDoModelo('nao sei responder')).toBeNull();
    expect(lerJsonDoModelo('{"bairro": }')).toBeNull();
    expect(lerJsonDoModelo('} ao contrario {')).toBeNull();
  });
});
