// Normalizacao de texto que veio da rede.
//
// Existe como modulo proprio porque a MESMA regra precisa valer em tres
// lugares do pipeline — na validacao da entrada, no saneamento da extracao e
// no preparo do texto que entra no prompt. Tres copias da mesma regex sao
// tres oportunidades de uma delas ficar para tras.

/**
 * Caracteres que nao deveriam existir em texto digitado por gente:
 * controles C0/C1, o zero-width space e a familia de marcas de direcao, os
 * separadores de linha/paragrafo do Unicode e o BOM.
 *
 * Por que isto e' questao de seguranca e nao de higiene: invisivel e' o
 * veiculo classico de injecao. Texto que a pessoa LE como inofensivo pode
 * carregar marcas de direcao que reordenam a exibicao, ou quebras que o
 * modelo interpreta como fim de secao do prompt. Some com tudo antes.
 *
 * ⚠️ As sequencias abaixo sao ESCAPES (`\u2028`), nunca o caractere em si.
 * Colar o caractere literal aqui quebra o proprio parser — \u2028 e \u2029
 * terminam a linha para o JavaScript, entao a regex fica sem fechar.
 */
const INVISIVEIS = /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028\u2029\uFEFF]/g;

/** Troca invisivel por espaco e colapsa o espaco resultante. */
export function removerInvisiveis(valor: string): string {
  return valor.replace(INVISIVEIS, ' ').replace(/\s+/g, ' ').trim();
}

/** `removerInvisiveis` + corte de tamanho. */
export function normalizarCampo(valor: string, tamanhoMaximo: number): string {
  return removerInvisiveis(valor).slice(0, tamanhoMaximo);
}
