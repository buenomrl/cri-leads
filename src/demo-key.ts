// Guarda a chave de demo digitada na tela.
//
// sessionStorage, e nao localStorage: a chave morre quando a aba fecha. Ela
// NUNCA e' compilada no bundle (nada de VITE_*) — quem avalia recebe a chave no
// e-mail da entrega e digita. Todo acesso vai em try/catch porque o storage
// pode estar bloqueado (janela privada, politica do navegador), e a tela tem
// de funcionar em modo leitura mesmo assim.

const CHAVE_STORAGE = 'cri-leads.demo-key';

export function lerChaveDemo(): string | null {
  try {
    return sessionStorage.getItem(CHAVE_STORAGE);
  } catch {
    return null;
  }
}

export function salvarChaveDemo(chave: string): void {
  try {
    sessionStorage.setItem(CHAVE_STORAGE, chave);
  } catch {
    // Sem storage a chave vale so' enquanto o estado do React viver.
  }
}

export function apagarChaveDemo(): void {
  try {
    sessionStorage.removeItem(CHAVE_STORAGE);
  } catch {
    // nada a fazer
  }
}
