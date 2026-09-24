import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Teste aqui e' da camada de REGRA (funcoes puras), nao de tela. O que entra:
// validacao de entrada, agregacao da analytics, mascara de telefone, guard de
// saida do agente e o compositor da mensagem. Componente React esta' fora de
// escopo de proposito — o valor estaria em testar o navegador, nao a regra.
//
// ATENCAO: o include TEM de cobrir supabase/functions/_shared, senao a camada
// de teste inteira simplesmente nao roda e o `npm test` passa verde vazio.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['supabase/functions/_shared/**/*.test.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./supabase/functions/_shared', import.meta.url)),
    },
  },
});
