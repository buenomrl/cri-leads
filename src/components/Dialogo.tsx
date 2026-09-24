// <dialog> nativo: foco preso, Esc e backdrop de graca, sem biblioteca. Fechar
// clicando no backdrop NAO vem de graca — e' o onClick abaixo: o conteudo
// ocupa o dialog inteiro, entao um clique cujo alvo e' o proprio <dialog> so'
// pode ter sido fora dele.

import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  aberto: boolean;
  onFechar: () => void;
  rotulo: string;
  children: ReactNode;
}

export function Dialogo({ aberto, onFechar, rotulo, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      aria-label={rotulo}
      onClose={onFechar}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close();
      }}
    >
      {aberto && children}
    </dialog>
  );
}
