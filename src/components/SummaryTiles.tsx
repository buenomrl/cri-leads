import type { Resumo } from '@shared/analytics.ts';
import { STATUS_LABEL, STATUS_ORDEM } from '@shared/domain.ts';

export function SummaryTiles({ resumo }: { resumo: Resumo }) {
  return (
    <section className="tiles" aria-label="Resumo por status">
      <div className="cartao tile">
        <span className="rotulo">Total</span>
        <span className="tile-valor num">{resumo.total}</span>
      </div>
      {STATUS_ORDEM.map((s) => (
        <div key={s} className="cartao tile">
          <span className="rotulo" style={{ color: `var(--st-${s})` }}>
            {STATUS_LABEL[s]}
          </span>
          <span className="tile-valor num">{resumo.porStatus[s]}</span>
        </div>
      ))}
    </section>
  );
}
