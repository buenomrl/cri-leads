import {
  ORIGEM_LABEL,
  STATUS_LABEL,
  STATUS_ORDEM,
  type Lead,
  type Status,
} from '@shared/domain.ts';

import type { CSSProperties } from 'react';

import type { ColunaOrdenavel, Ordem } from '../lead-list.ts';
import { SUPORTA_TRANSICAO } from '../transicao.ts';

interface Props {
  leads: Lead[];
  escritaLiberada: boolean;
  /** ids dos leads com mudanca de status em andamento. */
  salvando: ReadonlySet<string>;
  ordem: Ordem;
  /** Termo buscado, so' para a mensagem de lista vazia. */
  busca: string;
  /** Muda quando filtro ou ordem mudam: reanima a lista inteira. */
  chaveLista: string;
  /** Lead cujo status acabou de ser salvo: ganha um brilho breve de confirmacao. */
  recemSalvo: string | null;
  onOrdenar: (coluna: ColunaOrdenavel) => void;
  onMudarStatus: (lead: Lead, status: Status) => void;
  onAbrirAgente: (lead: Lead) => void;
}

const COLUNAS: { coluna: ColunaOrdenavel; rotulo: string }[] = [
  { coluna: 'nome', rotulo: 'Nome' },
  { coluna: 'telefone', rotulo: 'Telefone' },
  { coluna: 'imovel_interesse', rotulo: 'Imóvel de interesse' },
  { coluna: 'origem', rotulo: 'Origem' },
];

export function LeadsTable({
  leads,
  escritaLiberada,
  salvando,
  ordem,
  busca,
  chaveLista,
  recemSalvo,
  onOrdenar,
  onMudarStatus,
  onAbrirAgente,
}: Props) {
  return (
    <div className={`cartao tabela-caixa${SUPORTA_TRANSICAO ? ' com-transicao' : ''}`}>
      <table>
        <thead>
          <tr>
            {COLUNAS.map(({ coluna, rotulo }) => {
              const ativa = ordem?.coluna === coluna ? ordem.direcao : null;
              return (
                <th
                  key={coluna}
                  scope="col"
                  aria-sort={ativa === 'asc' ? 'ascending' : ativa === 'desc' ? 'descending' : 'none'}
                >
                  <button type="button" className={`ordenar${ativa ? ' ativa' : ''}`} onClick={() => onOrdenar(coluna)}>
                    {rotulo}
                    {/* Um so' triangulo que GIRA entre asc e desc, em vez de trocar de caractere. */}
                    <span aria-hidden="true" className={`seta-ordem${ativa === 'desc' ? ' desc' : ''}`}>
                      {ativa ? '▲' : '↕'}
                    </span>
                  </button>
                </th>
              );
            })}
            <th scope="col">Status</th>
            <th scope="col">Agente</th>
          </tr>
        </thead>
        {/* Com View Transitions (transicao.ts), cada linha tem nome proprio e o
            navegador anima entrada, saida e reposicionamento. Sem suporte, fica o
            plano B: `key` troca com filtro e ordem e a lista reanima em cascata. */}
        <tbody key={SUPORTA_TRANSICAO ? undefined : chaveLista}>
          {leads.length === 0 && (
            <tr>
              <td colSpan={6} className="vazio">
                {busca.trim() ? `Nenhum lead encontrado para “${busca.trim()}”.` : 'Nenhum lead com este status.'}
              </td>
            </tr>
          )}
          {leads.map((lead, i) => (
            <tr
              key={lead.id}
              className={recemSalvo === lead.id ? 'salvo' : undefined}
              style={
                { '--i': i, viewTransitionName: SUPORTA_TRANSICAO ? `lead-${lead.id}` : undefined } as CSSProperties
              }
            >
              <td className="col-nome">{lead.nome}</td>
              <td className="col-tel num" title="Mascarado na listagem pública">{lead.telefone}</td>
              <td className="col-imovel">{lead.imovel_interesse}</td>
              <td className="suave">{ORIGEM_LABEL[lead.origem]}</td>
              <td>
                {escritaLiberada ? (
                  <select
                    className={`status status-${lead.status}`}
                    value={lead.status}
                    disabled={salvando.has(lead.id)}
                    aria-label={`Status de ${lead.nome}`}
                    onChange={(e) => onMudarStatus(lead, e.target.value as Status)}
                  >
                    {STATUS_ORDEM.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`status status-${lead.status}`}>{STATUS_LABEL[lead.status]}</span>
                )}
              </td>
              <td>
                <button type="button" className="btn btn-acento" onClick={() => onAbrirAgente(lead)}>
                  Gerar mensagem
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
