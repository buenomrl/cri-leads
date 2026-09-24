import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { STATUS_LABEL, STATUS_ORDEM, type Status } from '@shared/domain.ts';

export type Filtro = Status | 'todos';

interface Props {
  filtro: Filtro;
  total: number;
  porStatus: Record<Status, number>;
  onMudar: (f: Filtro) => void;
}

interface Posicao {
  x: number;
  y: number;
  largura: number;
  altura: number;
}

/**
 * Pilulas de status com um marcador escuro por tras que DESLIZA ate a pilula
 * escolhida (como um controle segmentado de app), em vez de trocar de cor no
 * lugar. A posicao sai da propria pilula, medida depois do layout.
 */
export function StatusFilter({ filtro, total, porStatus, onMudar }: Props) {
  const opcoes: { valor: Filtro; rotulo: string; n: number }[] = [
    { valor: 'todos', rotulo: 'Todos', n: total },
    ...STATUS_ORDEM.map((s) => ({ valor: s, rotulo: STATUS_LABEL[s], n: porStatus[s] })),
  ];

  const botoes = useRef(new Map<Filtro, HTMLButtonElement>());
  const [pos, setPos] = useState<Posicao | null>(null);
  // Primeira medida sem animacao: o marcador ja' nasce no lugar certo.
  const [pronto, setPronto] = useState(false);

  const medir = useCallback(() => {
    const el = botoes.current.get(filtro);
    if (!el) return;
    setPos({ x: el.offsetLeft, y: el.offsetTop, largura: el.offsetWidth, altura: el.offsetHeight });
  }, [filtro]);

  useLayoutEffect(() => {
    medir();
  }, [medir, total, porStatus]);

  useLayoutEffect(() => {
    if (pos && !pronto) requestAnimationFrame(() => setPronto(true));
  }, [pos, pronto]);

  // Largura de tela muda o quebra-linha das pilulas: remede.
  useLayoutEffect(() => {
    window.addEventListener('resize', medir);
    return () => window.removeEventListener('resize', medir);
  }, [medir]);

  return (
    <div className="filtro" role="group" aria-label="Filtrar por status">
      {pos && (
        <span
          aria-hidden="true"
          className={`filtro-marcador${pronto ? ' pronto' : ''}`}
          style={{
            transform: `translate(${pos.x}px, ${pos.y}px)`,
            width: pos.largura,
            height: pos.altura,
          }}
        />
      )}
      {opcoes.map((o) => (
        <button
          key={o.valor}
          ref={(el) => {
            if (el) botoes.current.set(o.valor, el);
            else botoes.current.delete(o.valor);
          }}
          type="button"
          className="btn pilula"
          aria-pressed={filtro === o.valor}
          onClick={() => onMudar(o.valor)}
        >
          {o.rotulo} <span className="num">{o.n}</span>
        </button>
      ))}
    </div>
  );
}
