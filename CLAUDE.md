# CRI Leads — contexto do projeto

Mini sistema de captação de leads, feito como **case técnico** para a vaga de Desenvolvedor(a) Jr,
Agentes de IA na CRI Soluções Imobiliárias. Prazo de 3 dias. O enunciado tem 5 etapas: banco de
leads (≥20 registros), interpretação dos dados por consulta real, interface simples, um agente de IA
que gera a 1ª mensagem de resposta, e documentação.

Duas coisas o enunciado diz de forma explícita e que mandam nas prioridades daqui:
a **Etapa 5 (documentação) pesa tanto quanto o código** e a **Etapa 4 (agente) é "a mais próxima do
que a vaga realmente faz"**. Tempo economizado em outras frentes vai para essas duas.

Prioridade declarada pelo dono do projeto: **1) segurança**, **2) design clean**.

## Regras de processo

- **Plan mode com Plannotator SEMPRE antes de qualquer alteração de código**: entrar em plan mode
  (`EnterPlanMode`), montar o plano e submeter via `ExitPlanMode` — só implementar depois do plano
  aprovado. Exceção: correções triviais pedidas explicitamente durante uma rodada já aprovada.
- **Commits em inglês**, prefixo convencional, um por unidade de trabalho.
- **Comentários e documentação em PT-BR.** A banca é brasileira e o vocabulário de domínio vem do
  enunciado em português (`origem`, `imovel_interesse`, `qualificado`), então colunas e valores de
  domínio também são em português. Identificadores de infraestrutura ficam em inglês.
- ⚠️ **NUNCA editar fonte com `Get-Content`/`Set-Content` do PowerShell 5.1** — lê UTF-8 sem BOM como
  ANSI e corrompe acentos. Usar as ferramentas de edição ou Node.
- Mudança de schema = **novo arquivo** em `supabase/migrations/`, colado no SQL Editor pelo dono do
  projeto (não há acesso DDL por API).
- **Segredo nenhum no repo.** `.env.example` é o contrato; valores ficam em `supabase secrets` e na
  Vercel. Toda variável `VITE_*` é embutida no bundle público — logo nada secreto pode ser `VITE_*`.

## Testes

Vitest, `npm test`. **Só a camada de REGRA** (funções puras): validação de entrada, agregação da
analytics, máscara de telefone, guard de saída do agente, compositor da mensagem. Testes ao lado do
fonte (`arquivo.test.ts`).

Componente React está fora de escopo de propósito. A convenção que importa: **regra que importa vira
função pura, com teste ao lado** — enquanto a regra vive dentro de um handler de clique, não há onde
o teste morder.

⚠️ O `include` do `vitest.config.ts` precisa cobrir `supabase/functions/_shared/**/*.test.ts`. Se
alguém estreitar isso, a camada de teste inteira para de rodar **em silêncio** e o `npm test` passa
verde vazio.

## Arquitetura

### A decisão central: o navegador não tem credencial de banco

O front **não** recebe chave do Supabase, nem a publishable. Ele fala só com 2 Edge Functions. A
tabela `leads` tem RLS ligada e o app a acessa por `service_role`, que só existe dentro das functions.

O que isso garante, dito com honestidade: **não há credencial exposta e não há superfície de consulta
arbitrária**. O que isso **não** garante: sigilo dos dados — um endpoint público de listagem devolve
nome e telefone para quem achar a URL. O que protege o PII aqui é o dado ser **fictício** e estar
documentado como tal. Não inverter essa frase na documentação: um avaliador que testar o endpoint
pega a inversão, e aí o controle custa mais do que rende.

### Camadas

- `src/` — front (Vite + React 19 + TS). Única variável: `VITE_API_BASE_URL`. `src/api/client.ts` é
  o único ponto que conhece a URL e manda `x-demo-key`. Sem a variável, em `npm run dev`, roda contra
  `src/api/demo-local.ts` (API em memória com as funções reais de `_shared`); a condição fica inline
  com `import.meta.env.DEV` para o módulo **sair do bundle de produção** — conferir com grep no `dist/`.
- `supabase/functions/_shared/` — **camada de regra pura**, isomórfica: sem API do Deno, sem
  `fetch`, sem env. Importada pelo front (alias `@shared`), pelos testes e pelas functions. É aqui
  que vive a única implementação de cada regra, então tela, servidor e teste concordam por
  construção.
- `supabase/functions/_server/` — helpers que **só** rodam no Deno (env, CORS, cliente do banco,
  cliente da Anthropic). Fora do `tsconfig.json` do front de propósito.
- `supabase/functions/leads/` e `.../agent-first-message/` — os 2 endpoints.
- `analytics/` — as consultas da Etapa 2 como arquivos, com resultado real colado e leitura.
- `design/` — protótipo HTML aprovado antes do React.

⚠️ O prefixo `_` em `_shared` e `_server` é **load-bearing**: é o que faz o CLI do Supabase não tentar
publicar essas pastas como functions.

### Decisões de segurança e o que foi cortado

- **`verify_jwt = false`** nas functions (`supabase/config.toml`). É a única alternativa a embutir a
  anon key no bundle; com RLS em deny por padrão, a anon key nunca era o risco.
- **Escritas atrás de uma chave de demo** (`x-demo-key`, comparação em tempo constante). A UI pública
  é somente leitura para quem abrir o link; criar lead, mudar status e gerar mensagem exigem a chave.
  **Não é autenticação** — a documentação diz isso com essas palavras, junto do desenho de produção.
- **RLS com policies escritas**, não com zero policies: as policies de `authenticated` são commitadas
  como o modelo de produção, com comentário no SQL explicando que a ausência de policy sob RLS *é* o
  deny — a propriedade da qual o app realmente depende.
- **Cortados de propósito**, cada um virando uma frase na documentação em vez de código:
  rate limit por IP (`x-forwarded-for` é influenciável e rotacionar IP é grátis — o que segura a
  conta da Anthropic é **cap diário global** + spend limit na key); captcha (dependência externa que
  pode bloquear o avaliador); índices em 25 linhas; tipos `ENUM` do Postgres (`text` + `check` evita
  a armadilha de evolução de schema); Zod (validador puro de ~40 linhas evita briga de npm specifier
  no Deno e é exatamente a camada que o Vitest testa).
- **CORS é higiene, não controle de acesso** — `curl` ignora CORS. Descrever assim, não como defesa.

### O agente (Etapa 4) é pipeline, não uma chamada

`extrai → compõe → guard → fallback`, com cap diário lido de `agent_runs`. O texto do lead entra no
prompt em tags, marcado como **dado não confiável, nunca instrução**. O guard de saída rejeita URL ou
telefone que não esteja no registro do lead. A mensagem é sempre **sugestão para humano revisar** —
nunca enviada. O alvo real de um prompt injection aqui é o humano que copia e cola, não o modelo.

## Infra

- **Supabase** projeto `cri-leads`, região `sa-east-1`. ⚠️ Vive numa **segunda conta** Supabase: o
  free tier limita a 2 projetos ativos **por usuário** (não por organização — criar outra org não
  resolve, a mensagem de erro é explícita). O CLI convive com as duas contas pela variável
  `SUPABASE_ACCESS_TOKEN` (Personal Access Token da conta nova), que tem precedência sobre o login
  salvo. O token fica em `.env.supabase.local` (gitignorado por `.env.*`). ⚠️ **Não** usar
  `--profile`: essa flag escolhe o endpoint da API, não a conta (`Unsupported Config Type`).
- ⚠️ Projeto free **pausa após ~7 dias** sem atividade e o link publicado é entregável duro. Um cron
  externo grátis pinga a rota de listagem uma vez por dia.
- **Vercel** para o front. **GitHub** público `buenomrl/cri-leads`.
- `react` pinado em **19.2.3**; TypeScript `~6.0.3` com `erasableSyntaxOnly`.

## Comandos

```bash
npm install
npm run dev          # front em :5173; sem VITE_API_BASE_URL roda em modo local (API em memória)
npm test             # camada de regra
npm run typecheck
npm run build

# conta Supabase do projeto: token lido do arquivo local, nunca colado no comando
export $(grep -v '^#' .env.supabase.local | xargs)
npx supabase secrets set NOME=valor --project-ref <ref>   # rodado pelo dono do projeto
npx supabase functions deploy --project-ref <ref>
```
