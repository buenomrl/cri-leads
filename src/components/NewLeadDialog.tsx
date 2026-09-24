// Formulario de novo lead.
//
// Valida com o MESMO validarNovoLead que roda na Edge Function — aqui so' para
// dar o erro na hora. Quem recusa de verdade e' o servidor (e o `check` do
// Postgres atras dele); por isso os erros que voltam da API tambem aparecem.

import { useEffect, useState, type FormEvent } from 'react';

import { LIMITES, ORIGEM_LABEL, ORIGENS, type Origem } from '@shared/domain.ts';
import { validarNovoLead, type NovoLead } from '@shared/validation.ts';

import { ErroApi } from '../api/types.ts';
import { Dialogo } from './Dialogo.tsx';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  onCriar: (novo: NovoLead) => Promise<void>;
}

const VAZIO = { nome: '', telefone: '', imovel_interesse: '', origem: 'site' as Origem };

export function NewLeadDialog({ aberto, onFechar, onCriar }: Props) {
  const [form, setForm] = useState(VAZIO);
  const [erros, setErros] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  // Um salvamento que termina depois do dialogo fechado (Esc no meio do envio)
  // pode deixar erro para tras; ele nao pode reaparecer na proxima abertura.
  useEffect(() => {
    if (aberto) setErros([]);
  }, [aberto]);

  function fechar() {
    setForm(VAZIO);
    setErros([]);
    onFechar();
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const v = validarNovoLead(form);
    if (!v.ok) {
      setErros(v.erros);
      return;
    }
    setEnviando(true);
    setErros([]);
    try {
      await onCriar(v.valor);
      setForm(VAZIO);
    } catch (erro) {
      if (erro instanceof ErroApi) setErros(erro.detalhes.length ? erro.detalhes : [erro.message]);
      else setErros(['Não foi possível salvar o lead.']);
    } finally {
      setEnviando(false);
    }
  }

  const campo = (k: keyof typeof VAZIO) => ({
    value: form[k],
    onChange: (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value }),
  });

  return (
    <Dialogo aberto={aberto} onFechar={fechar} rotulo="Novo lead">
      <form className="dialogo" onSubmit={enviar} noValidate>
        <h2>Novo lead</h2>

        <label className="campo">
          Nome
          <input autoComplete="off" maxLength={LIMITES.nome.max} {...campo('nome')} autoFocus />
        </label>

        <div className="campos-2">
          <label className="campo">
            Telefone
            <input
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="(11) 90000-0000"
              maxLength={LIMITES.telefone.max}
              {...campo('telefone')}
            />
          </label>
          <label className="campo">
            Origem
            <select {...campo('origem')}>
              {ORIGENS.map((o) => (
                <option key={o} value={o}>{ORIGEM_LABEL[o]}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="campo">
          Imóvel de interesse
          <textarea maxLength={LIMITES.imovelInteresse.max} {...campo('imovel_interesse')} />
          <small>Texto livre, como o lead escreveu. Entra no status “Novo”.</small>
        </label>

        {erros.length > 0 && (
          <div className="aviso" role="alert">
            Revise os campos:
            <ul>{erros.map((e) => <li key={e}>{e}</li>)}</ul>
          </div>
        )}

        <div className="dialogo-acoes">
          <button type="button" className="btn" onClick={fechar}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={enviando}>
            {enviando ? 'Salvando…' : 'Salvar lead'}
          </button>
        </div>
      </form>
    </Dialogo>
  );
}
