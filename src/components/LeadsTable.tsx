import {
  ORIGEM_LABEL,
  STATUS_LABEL,
  STATUS_ORDEM,
  type Lead,
  type Status,
} from '@shared/domain.ts';

interface Props {
  leads: Lead[];
  escritaLiberada: boolean;
  /** ids dos leads com mudanca de status em andamento. */
  salvando: ReadonlySet<string>;
  onMudarStatus: (lead: Lead, status: Status) => void;
  onAbrirAgente: (lead: Lead) => void;
}

export function LeadsTable({ leads, escritaLiberada, salvando, onMudarStatus, onAbrirAgente }: Props) {
  return (
    <div className="cartao tabela-caixa">
      <table>
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Telefone</th>
            <th scope="col">Imóvel de interesse</th>
            <th scope="col">Origem</th>
            <th scope="col">Status</th>
            <th scope="col">Agente</th>
          </tr>
        </thead>
        <tbody>
          {leads.length === 0 && (
            <tr>
              <td colSpan={6} className="vazio">Nenhum lead com este status.</td>
            </tr>
          )}
          {leads.map((lead) => (
            <tr key={lead.id}>
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
