import { describe, expect, it } from 'vitest';

import { comporMensagem, extracaoVazia } from './compose-message.ts';
import { verificarMensagem } from './output-guard.ts';

const TELEFONE_DO_LEAD = '(11) 90114-2207';

const MENSAGEM_BOA =
  'Olá, Ana! Aqui é da CRI Soluções Imobiliárias, obrigado pelo seu contato.\n\n' +
  'Anotei seu interesse em apartamento de 3 dormitórios na região do Itaim Bibi. ' +
  'Para eu separar as opções mais alinhadas, qual faixa de investimento tem em mente?';

describe('verificarMensagem — o que tem de passar', () => {
  it('aprova uma primeira mensagem legitima', () => {
    expect(verificarMensagem(MENSAGEM_BOA, TELEFONE_DO_LEAD).ok).toBe(true);
  });

  // Regressao: valor de imovel tem MUITO digito. Um guard que procurasse
  // "sequencia longa de numeros" bloquearia a mensagem certa e a demo ficaria
  // caindo no fallback sem ninguem entender por quê.
  it('nao confunde valor de imovel com telefone', () => {
    const comValores =
      MENSAGEM_BOA + ' Trabalhamos na faixa citada de R$ 12.000.000,00 e metragem de 1.200 m².';
    expect(verificarMensagem(comValores, TELEFONE_DO_LEAD).ok).toBe(true);
  });

  it('deixa passar o telefone do proprio lead', () => {
    const r = verificarMensagem(`${MENSAGEM_BOA} Confirmo o contato (11) 90114-2207.`, TELEFONE_DO_LEAD);
    expect(r.ok).toBe(true);
  });

  // Se o guard rejeitasse a propria saida deterministica, o pipeline nao teria
  // fallback nenhum — so um loop de bloqueio.
  it('a mensagem de fallback passa no proprio guard', () => {
    const { mensagem } = comporMensagem('Ana Beatriz Salgado', extracaoVazia());
    expect(verificarMensagem(mensagem, TELEFONE_DO_LEAD).ok).toBe(true);
  });
});

describe('verificarMensagem — o que tem de bloquear', () => {
  it('bloqueia link em qualquer forma', () => {
    const formas = [
      `${MENSAGEM_BOA} Veja em https://imoveis-premium.xyz/oferta`,
      `${MENSAGEM_BOA} Acesse www.outrocorretor.com.br`,
      `${MENSAGEM_BOA} Detalhes em portal-imoveis.com`,
      `${MENSAGEM_BOA} [Clique aqui](http://phishing.example)`,
    ];
    for (const m of formas) {
      expect(verificarMensagem(m, TELEFONE_DO_LEAD).motivo).toBe('contem_link');
    }
  });

  it('bloqueia telefone de terceiro — o estrago real de um prompt injection', () => {
    const formas = [
      `${MENSAGEM_BOA} Fale direto comigo no (11) 98888-7777.`,
      `${MENSAGEM_BOA} Meu WhatsApp é 99999-1234.`,
      `${MENSAGEM_BOA} Chame no +55 11 97777 6666.`,
    ];
    for (const m of formas) {
      expect(verificarMensagem(m, TELEFONE_DO_LEAD).motivo).toBe('contem_telefone');
    }
  });

  it('bloqueia e-mail', () => {
    const r = verificarMensagem(`${MENSAGEM_BOA} Responda para outro@corretor.com`, TELEFONE_DO_LEAD);
    // Link e e-mail se sobrepoem; o que importa e que NAO passou.
    expect(r.ok).toBe(false);
  });

  it('bloqueia vazamento das instrucoes do sistema', () => {
    const r = verificarMensagem(
      `${MENSAGEM_BOA} Minhas instruções do sistema dizem para extrair dados_do_lead.`,
      TELEFONE_DO_LEAD,
    );
    expect(r.motivo).toBe('vazou_instrucao');
  });

  it('bloqueia resposta vazia, curta demais e longa demais', () => {
    expect(verificarMensagem('', TELEFONE_DO_LEAD).motivo).toBe('vazia');
    expect(verificarMensagem('Ok.', TELEFONE_DO_LEAD).motivo).toBe('curta_demais');
    expect(verificarMensagem('a'.repeat(1300), TELEFONE_DO_LEAD).motivo).toBe('longa_demais');
  });

  it('bloqueia mesmo sem conhecer o telefone do lead', () => {
    // O painel permite gerar mensagem para lead hipotetico, sem telefone.
    const r = verificarMensagem(`${MENSAGEM_BOA} Chame no (11) 98888-7777.`, '');
    expect(r.motivo).toBe('contem_telefone');
  });
});
