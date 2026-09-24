import { useState, type FormEvent } from 'react';

import { Dialogo } from './Dialogo.tsx';

interface Props {
  aberto: boolean;
  modoLocal: boolean;
  onFechar: () => void;
  onSalvar: (chave: string) => void;
}

export function DemoKeyDialog({ aberto, modoLocal, onFechar, onSalvar }: Props) {
  const [chave, setChave] = useState('');

  function enviar(e: FormEvent) {
    e.preventDefault();
    const limpa = chave.trim();
    if (!limpa) return;
    onSalvar(limpa);
    setChave('');
  }

  return (
    <Dialogo aberto={aberto} onFechar={onFechar} rotulo="Destravar escrita">
      <form className="dialogo" onSubmit={enviar}>
        <h2>Destravar escrita</h2>
        <p className="suave" style={{ fontSize: 14, lineHeight: 1.55 }}>
          A leitura é aberta. Criar lead, mudar status e gerar mensagem pedem a chave de demonstração
          enviada junto com a entrega. Ela fica só nesta aba e é conferida pelo servidor a cada escrita.
        </p>
        <p className="nota">
          Isto não é autenticação: é uma chave única e compartilhada, que evita que qualquer pessoa com o
          link altere a base ou gaste crédito de IA durante a avaliação.
          {modoLocal && ' No modo local, qualquer valor serve.'}
        </p>
        <label className="campo">
          Chave de demonstração
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            autoFocus
          />
        </label>
        <div className="dialogo-acoes">
          <button type="button" className="btn" onClick={onFechar}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={!chave.trim()}>Destravar</button>
        </div>
      </form>
    </Dialogo>
  );
}
