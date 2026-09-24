// Transicao suave para mudancas da lista (View Transitions API).
//
// O navegador fotografa a tela antes e depois da mudanca e anima a diferenca:
// linhas que ficam deslizam para a nova posicao, as que saem esmaecem, as que
// entram aparecem, e a caixa da tabela muda de altura sem salto. Cada linha
// tem `view-transition-name` proprio (LeadsTable) para isso funcionar.
//
// Sem suporte no navegador, ou com "reduzir movimento" ligado no sistema, a
// mudanca e' aplicada direto — o que ja' e' o comportamento correto.

import { flushSync } from 'react-dom';

export const SUPORTA_TRANSICAO =
  typeof document !== 'undefined' && typeof document.startViewTransition === 'function';

let emAndamento = false;

function menosMovimento(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * `tipo` so' ajusta a duracao no CSS (a busca e' mais curta, porque roda a
 * cada tecla). Se ja' houver uma transicao rodando — digitacao rapida —
 * aplica direto em vez de cortar a anterior no meio.
 */
export function comTransicao(fn: () => void, tipo: 'lista' | 'busca' = 'lista'): void {
  if (!SUPORTA_TRANSICAO || emAndamento || menosMovimento()) {
    fn();
    return;
  }
  emAndamento = true;
  const raiz = document.documentElement;
  raiz.dataset.transicao = tipo;
  const t = document.startViewTransition(() => flushSync(fn));
  t.finished.finally(() => {
    emAndamento = false;
    delete raiz.dataset.transicao;
  });
}
