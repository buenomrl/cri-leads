// Origem x qualificacao: o "resumo visual" da Etapa 3 e, ao mesmo tempo, o
// achado da Etapa 2 na propria tela. Os numeros vem prontos da API
// (resumoDeLeads); aqui so' se desenha.

import type { Resumo } from '@shared/analytics.ts';
import { ORIGEM_LABEL } from '@shared/domain.ts';

import { percentual } from '../format.ts';

export function OrigemChart({ resumo }: { resumo: Resumo }) {
  const maiorVolume = Math.max(1, ...resumo.porOrigem.map((o) => o.total));
  const comLeads = resumo.porOrigem.filter((o) => o.total > 0);
  const lider = resumo.porOrigem.find((o) => o.origem === resumo.origemLider);
  const melhorTaxa = comLeads.reduce<(typeof comLeads)[number] | null>(
    (m, o) => (m === null || o.taxaQualificacao > m.taxaQualificacao ? o : m),
    null,
  );
  const { comDetalhe, semDetalhe } = resumo.porDetalhamento;

  return (
    <section className="cartao grafico" aria-labelledby="titulo-grafico">
      <div className="grafico-topo">
        <h2 id="titulo-grafico">Origem × qualificação</h2>
        <div className="legenda" aria-hidden="true">
          <span><i style={{ background: 'var(--volume)' }} />volume</span>
          <span><i style={{ background: 'var(--acento)' }} />taxa de qualificação</span>
        </div>
      </div>

      <div className="barras">
        {resumo.porOrigem.map((o) => (
          <div key={o.origem} className="barra-linha">
            <span style={{ fontWeight: 500 }}>{ORIGEM_LABEL[o.origem]}</span>
            <div
              className="barra-pilha"
              role="img"
              aria-label={`${ORIGEM_LABEL[o.origem]}: ${o.total} leads, ${percentual(o.taxaQualificacao)} qualificados`}
            >
              <div className="trilho">
                <div style={{ width: `${(o.total / maiorVolume) * 100}%`, background: 'var(--volume)' }} />
              </div>
              <div className="trilho">
                <div style={{ width: `${o.taxaQualificacao}%`, background: 'var(--acento)' }} />
              </div>
            </div>
            <span className="suave num" style={{ textAlign: 'right' }}>
              {o.total} · {percentual(o.taxaQualificacao)}
            </span>
          </div>
        ))}
      </div>

      {lider && melhorTaxa && (
        <div className="leitura">
          <p>
            A origem de maior volume, <strong>{ORIGEM_LABEL[lider.origem]}</strong>, qualifica{' '}
            {percentual(lider.taxaQualificacao)}; a de melhor aproveitamento,{' '}
            <strong>{ORIGEM_LABEL[melhorTaxa.origem]}</strong>, qualifica{' '}
            {percentual(melhorTaxa.taxaQualificacao)} com {melhorTaxa.total} leads.
          </p>
          <p>
            Pedido com detalhe numérico (metragem, dormitórios, faixa de preço) qualifica{' '}
            {percentual(comDetalhe.taxaQualificacao)}; pedido vago, {percentual(semDetalhe.taxaQualificacao)}.
            Com n={resumo.total}, isto é direcional, não significativo.
          </p>
        </div>
      )}
    </section>
  );
}
