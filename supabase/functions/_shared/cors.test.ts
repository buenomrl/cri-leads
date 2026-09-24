import { describe, expect, it } from 'vitest';

import { lerOrigensPermitidas, origemLiberada } from './cors.ts';

const PERMITIDAS = ['https://cri-leads.vercel.app', 'http://localhost:5173'];

describe('lerOrigensPermitidas', () => {
  it('separa por virgula e ignora espacos e itens vazios', () => {
    expect(lerOrigensPermitidas(' https://cri-leads.vercel.app , http://localhost:5173,, ')).toEqual(PERMITIDAS);
  });

  it('valor vazio vira lista vazia', () => {
    expect(lerOrigensPermitidas('')).toEqual([]);
  });
});

describe('origemLiberada', () => {
  it('ecoa a origem quando ela esta na lista', () => {
    expect(origemLiberada('http://localhost:5173', PERMITIDAS)).toBe('http://localhost:5173');
  });

  it('origem desconhecida ou ausente NAO e ecoada', () => {
    expect(origemLiberada('https://site-malicioso.com', PERMITIDAS)).toBe('https://cri-leads.vercel.app');
    expect(origemLiberada(null, PERMITIDAS)).toBe('https://cri-leads.vercel.app');
  });

  it('parecida nao e igual: subdominio e barra no fim sao recusados', () => {
    expect(origemLiberada('https://cri-leads.vercel.app.evil.com', PERMITIDAS)).not.toBe(
      'https://cri-leads.vercel.app.evil.com',
    );
    expect(origemLiberada('https://cri-leads.vercel.app/', PERMITIDAS)).not.toBe('https://cri-leads.vercel.app/');
  });

  it('lista vazia nao libera nada', () => {
    expect(origemLiberada('https://cri-leads.vercel.app', [])).toBe('');
  });
});
