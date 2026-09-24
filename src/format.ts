/** 16.7 -> "16,7%" */
export function percentual(valor: number): string {
  return `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

/** 2410 -> "2,4 s" */
export function segundos(ms: number): string {
  return `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`;
}
