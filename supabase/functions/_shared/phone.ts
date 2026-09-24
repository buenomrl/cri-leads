// Mascara de telefone.
//
// Por que existe: a rota de listagem e' publica (a demo nao tem login, como o
// enunciado permite). Devolver o telefone inteiro para qualquer um que abra a
// URL nao acrescenta nada a' demonstracao — da' para provar listagem, filtro e
// resumo sem isso. Entao a listagem devolve mascarado e o numero inteiro so'
// sai num pedido explicito de detalhe.
//
// Isto e' MINIMIZACAO DE DADO, nao criptografia: quem tem acesso a rota de
// detalhe ve o numero. O que protege o dado de verdade nesta demo e' ele ser
// ficticio. Ver SECURITY.md.

/**
 * `(11) 90114-2207` -> `(11) 9****-**07`
 *
 * Mantem DDD, o primeiro digito do bloco (que diz se e' celular) e os dois
 * ultimos — o suficiente para uma pessoa reconhecer o proprio numero numa
 * lista, insuficiente para discar.
 */
export function mascararTelefone(telefone: string): string {
  const digitos = telefone.replace(/\D/g, '');

  if (digitos.length < 4) {
    // Entrada que nao parece telefone: nao tenta adivinhar formato, apaga tudo.
    return '*'.repeat(Math.max(telefone.trim().length, 4));
  }

  // Celular brasileiro: DDD + 9 digitos.
  if (digitos.length === 11) {
    return `(${digitos.slice(0, 2)}) ${digitos[2]}****-**${digitos.slice(9)}`;
  }

  // Fixo: DDD + 8 digitos.
  if (digitos.length === 10) {
    return `(${digitos.slice(0, 2)}) ****-**${digitos.slice(8)}`;
  }

  // Formato desconhecido (internacional, ramal...): mascara tudo menos o fim.
  return `${'*'.repeat(digitos.length - 2)}${digitos.slice(-2)}`;
}

/** So' os digitos, para comparar telefones sem depender de formatacao. */
export function digitosDoTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}
