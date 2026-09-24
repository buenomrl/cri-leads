// Regra do CORS: qual origem a resposta libera.
//
// ⚠️ CORS E' HIGIENE, NAO CONTROLE DE ACESSO. Impede que OUTRO site, no
// navegador de alguem, leia a resposta destas rotas; nao impede nada vindo de
// curl ou script. Quem controla escrita e' a chave de demo.
//
// Mora em `_shared` para ser testada; `_server/http.ts` le a env e chama daqui.

/** `"https://a.app, http://localhost:5173,,"` -> `["https://a.app", "http://localhost:5173"]` */
export function lerOrigensPermitidas(valor: string): string[] {
  return valor
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

/**
 * Ecoa a origem do pedido se ela estiver na lista. Se nao estiver, responde
 * com a primeira origem permitida — que nao casa com quem pediu, entao o
 * navegador bloqueia a leitura. Lista vazia libera nada.
 */
export function origemLiberada(origem: string | null, permitidas: readonly string[]): string {
  if (origem && permitidas.includes(origem)) return origem;
  return permitidas[0] ?? '';
}
