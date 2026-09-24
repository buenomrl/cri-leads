import { STATUS_LABEL, STATUS_ORDEM, type Status } from '@shared/domain.ts';

export type Filtro = Status | 'todos';

interface Props {
  filtro: Filtro;
  total: number;
  porStatus: Record<Status, number>;
  onMudar: (f: Filtro) => void;
}

export function StatusFilter({ filtro, total, porStatus, onMudar }: Props) {
  const opcoes: { valor: Filtro; rotulo: string; n: number }[] = [
    { valor: 'todos', rotulo: 'Todos', n: total },
    ...STATUS_ORDEM.map((s) => ({ valor: s, rotulo: STATUS_LABEL[s], n: porStatus[s] })),
  ];

  return (
    <div className="filtro" role="group" aria-label="Filtrar por status">
      {opcoes.map((o) => (
        <button
          key={o.valor}
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
