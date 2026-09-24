// <dialog> nativo: foco preso, Esc e backdrop de graca, sem biblioteca. Fechar
// clicando no backdrop NAO vem de graca — e' o onClick abaixo: o conteudo
// ocupa o dialog inteiro, entao um clique cujo alvo e' o proprio <dialog> so'
// pode ter sido fora dele.
//
// Animacao de entrada e saida: CSS (`@starting-style`, em styles.css). Para a
// SAIDA aparecer, o conteudo continua montado enquanto o dialog some, e so'
// desmonta depois — desmontar na hora deixaria uma caixa vazia esmaecendo.

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Um pouco mais que a duracao da transicao de saida em styles.css (--dur). */
const TEMPO_SAIDA_MS = 280;

interface Props {
  aberto: boolean;
  onFechar: () => void;
  rotulo: string;
  children: ReactNode;
}

export function Dialogo({ aberto, onFechar, rotulo, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [montado, setMontado] = useState(aberto);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto) {
      setMontado(true);
      if (!d.open) d.showModal();
      return;
    }
    if (d.open) d.close();
    const t = setTimeout(() => setMontado(false), TEMPO_SAIDA_MS);
    return () => clearTimeout(t);
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
      {montado && children}
    </dialog>
  );
}
