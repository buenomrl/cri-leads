# Documentação · Case técnico CRI

**Mini sistema de captação de leads, do banco à automação com IA.**
Interface: **https://cri-leads.vercel.app** · Código: **https://github.com/buenomrl/cri-leads**

> Para destravar as ações de escrita na interface (criar lead, mudar status, gerar mensagem), use a
> chave de demonstração enviada no e-mail. Sem ela, tudo fica visível em modo de leitura.

---

## Visão geral

| Peça | Onde roda | Por quê |
|---|---|---|
| Banco Postgres | Supabase (São Paulo) | Recomendado no enunciado, que diz ser o que a CRI usa internamente; migrações em SQL versionadas no repositório |
| API | 2 Edge Functions no Supabase | Segredos (acesso ao banco, chave da IA) ficam só no servidor |
| Interface | React + TypeScript na Vercel | Publicada, com deploy automático a cada push |
| Agente | Claude (Haiku 4.5 + Sonnet 5), via API da Anthropic | Pipeline em etapas, com defesa contra prompt injection |

**A decisão que orienta o resto:** o navegador não recebe nenhuma chave de banco. A tela fala só com
as duas Edge Functions, e a tabela `leads` não tem permissão nenhuma para os papéis públicos do
Supabase. Os detalhes estão em [SECURITY.md](SECURITY.md).

---

## Etapa 1 · Banco de dados

**O que construí.** A tabela `leads` com os campos pedidos (`nome`, `telefone`,
`imovel_interesse`, `origem`, `status`, `created_at`) e 25 leads fictícios nas 3 origens e nos 4
status. Tudo em migrações SQL em `supabase/migrations/`, que qualquer pessoa pode ler e reaplicar.
- Os valores permitidos são garantidos pelo próprio banco (`check`), além da validação na API.
- RLS ligada, sem nenhuma permissão para `anon` e `authenticated`; o `service_role`, usado só pelas
  functions, tem o mínimo necessário e **não pode apagar**. Lead que não deu certo vira "perdido".
- Os telefones usam uma faixa que não pertence a assinante real, e a listagem pública sempre
  devolve o número mascarado.

**Ferramentas e por quê.** Supabase, porque o enunciado recomenda e diz que é o que a CRI usa
internamente: quem avalia lê as migrações e as policies na ferramenta que já conhece.
`text` + `check` em vez de `ENUM` do Postgres, porque é mais simples de evoluir sem migração
delicada.

**Dificuldades.**
- O plano gratuito do Supabase limita **2 projetos por usuário** (não por organização, como eu
  esperava). Resolvi com uma segunda conta e um token de acesso separado, sem mexer no login da
  conta principal.
- O primeiro projeto foi criado por engano nos EUA. Recriei em São Paulo: com dado real de cliente
  brasileiro, manter os dados no país seria a escolha natural, e a latência para quem usa daqui é
  menor.
- Conferindo as permissões no banco real, descobri que o Supabase concede por padrão `TRUNCATE`
  (apagar a tabela inteira) ao `service_role`. Isso contradizia a regra "nada se apaga". A migração
  04 zera as permissões e concede de novo só o que a aplicação usa. Lição: conferir o banco real,
  não só o próprio código.

**Com mais tempo.** Tabela de histórico de mudanças de status (quem mudou, de quê para quê, quando)
e a coluna de responsável pelo lead.

---

## Etapa 2 · Interpretação dos dados

**O que construí.** Três consultas SQL em `analytics/`, cada uma com o resultado real colado embaixo,
e a leitura completa em [analytics/resultados.md](analytics/resultados.md).

| Pergunta | Resposta |
|---|---|
| Qual origem gerou mais leads? | **Site**: 12 de 25 (48%) |
| % de qualificados por origem | Indicação **60%** · WhatsApp 25% · Site **16,7%** |
| Outro padrão | Pedido com detalhe numérico qualifica **46,2%**; pedido vago, **8,3%** |

**A leitura:** volume e qualidade estão em ordem inversa, então a métrica que importa é lead
qualificado por canal, não lead por canal. E lead vago não é lead ruim, é lead que ainda não foi
perguntado. O padrão se repete dentro de cada origem, e os 4 leads perdidos são todos vagos. Esse
achado define o que o agente da Etapa 4 faz: responder já com a pergunta que falta.

**Ferramentas e por quê.** SQL puro, rodado no banco publicado. Os mesmos números são calculados de
forma paralela em TypeScript (`resumoDeLeads`), que alimenta a tela e é coberto por testes. Os
dois lados deram resultados idênticos, e um confere o outro.

**Dificuldades.** Dado sorteado não chega a conclusão nenhuma. Então o seed **foi desenhado** para
conter padrões, e o documento diz isso com essas palavras: as consultas demonstram que encontram um
padrão, não que ele existe no mercado. Com n=25, os números indicam direção, não significância.

**Com mais tempo.** Dados reais e a métrica de tempo até a primeira resposta (*speed-to-lead*), que
é o que mais pesa na conversão de lead imobiliário.

---

## Etapa 3 · Interface

**O que construí.** Uma tela publicada que lista os leads, filtra por status, mostra o resumo em
cards e um gráfico de origem × qualificação (que já exibe o achado da Etapa 2), e tem busca livre e
ordenação por coluna. Também permite criar lead e mudar status, atrás da chave de demonstração.

**Ferramentas e por quê.**
- React + TypeScript + Vite: tipagem de ponta a ponta com as regras do servidor, que são
  **importadas pela própria tela**. A validação do formulário é a mesma função que roda na API.
- Protótipo visual aprovado antes de escrever o React (`design/`), para errar no rascunho, não no
  código.
- Vercel, com cabeçalhos de segurança (CSP, bloqueio de iframe) em `vercel.json`.

**Dificuldades.** Desenvolver a tela antes de o banco existir. Resolvi com um **modo local**: sem a
URL da API, `npm run dev` roda contra uma API em memória que usa as mesmas regras reais. O build de
produção remove esse modo por completo, e conferi isso procurando por ele no pacote publicado.

**Com mais tempo.** Login por usuário (em vez da chave compartilhada), paginação para bases grandes e
atualização em tempo real quando outro SDR mexe no mesmo lead.

---

## Etapa 4 · Agente de automação

**O que construí.** Dado um lead (nome + texto do imóvel de interesse), o agente sugere a primeira
mensagem de resposta. Ele é uma **linha de montagem**, não uma chamada única:

```
texto do lead (entrada não confiável)
  → 1. extração (Haiku): lê o texto e devolve só campos fixos em JSON
  → saneamento: tipo forçado, 80 caracteres por campo, sem < > { } [ ] nem caracteres invisíveis
  → regra fixa escolhe A pergunta que falta: região → orçamento → dormitórios → prazo → financiamento → visita
  → 2. redação (Sonnet): vê só campos saneados (inclusive o primeiro nome), nunca o texto do imóvel
  → guard: recusa link, e-mail, telefone de terceiro, instrução vazada, mensagem vazia, curta ou longa demais
  → mensagem sugerida  ou  mensagem padrão montada por código (fallback)
```

- A mensagem é sempre **sugestão para uma pessoa revisar e enviar**. O sistema nunca envia nada.
- Cada execução fica registrada em `agent_runs` (veredito, tempo, tokens, versão do prompt), e um
  teto de 200 gerações por dia protege o crédito.
- A tela mostra o caminho inteiro: o que foi extraído, qual pergunta foi escolhida e por quê, e o
  veredito do guard. Tem também um botão para **testar com entrada hostil**.
- Na prática, nas 10 gerações bem-sucedidas registradas em `agent_runs` em 24/09/2026: 3,5 s em
  média, com ~1.270 tokens de entrada e ~210 de saída somando os dois passos. Mesmo calculando tudo
  no preço do Sonnet 5, dá menos de meio centavo de dólar por mensagem.

**Ferramentas e por quê.** Claude, com dois modelos: extrair é tarefa mecânica, e o Haiku resolve
bem e barato; a redação é o que o cliente lê, então vale o Sonnet. Separar em dois passos é o que
isola o texto do lead: uma injeção consegue no máximo sujar um campo curto e já higienizado.

**Dificuldades.**
- **Prompt injection.** O risco real não é a IA errar, é um corretor copiar e colar para um cliente o
  WhatsApp de um desconhecido. Por isso a última palavra é de código testado (o guard), não do
  modelo. No teste real, a injeção nem chegou à redação: a extração reduziu o ataque a "apartamento
  no Itaim".
- **Toda mensagem caía no fallback** no primeiro deploy. O registro em `agent_runs` mostrava
  "provedor respondeu 400": o Sonnet 5 não aceita o parâmetro `temperature`, que eu enviava. Corrigi
  e passei a conferir se a resposta veio completa, para uma mensagem cortada no meio nunca chegar à
  tela. Enquanto o bug existia, o sistema entregou a mensagem padrão e registrou o motivo.

**Com mais tempo.**
- Um campo de **características** na extração (piscina, varanda, vista…), com valores de uma lista
  fechada. Hoje um pedido como "imóvel para morar com piscina" recebe uma resposta genérica, porque
  a redação só vê os campos fixos. É o custo consciente do isolamento, e dá para reduzir sem abrir
  mão dele.
- Uma avaliação sistemática: rodar o agente sobre um conjunto fixo de leads e de ataques a cada
  mudança de prompt, e comparar as versões.
- Gerar a sugestão automaticamente ao cadastrar o lead e guardar o histórico de sugestões por lead.

---

## Qualidade e verificação

- **100 testes** (Vitest) nas regras que importam: validação, números da análise, máscara de
  telefone, guard do agente, escolha da pergunta, preparo do texto para o prompt, comparação da
  chave, leitura da resposta do modelo, CORS, busca e ordenação.
- **`npm run smoke`** verifica a API publicada: escrita sem chave recusada (401), dado inválido
  recusado (400), tentativa de apagar recusada (405), telefone sempre mascarado, CORS e, com
  `--agente`, a entrada hostil.

## Como usei IA para construir

Construí com o **Claude Code**. O fluxo foi o mesmo em todas as mudanças: um **plano escrito e
aprovado antes** de virar código, implementação, testes e uma **revisão feita por um agente
separado**, que apontou problemas reais (entre eles uma linha que o CLI da Vercel acrescentou ao
`.gitignore` e que passou a esconder o `.env.example`, e um privilégio novo do Postgres 17 que a
primeira versão da migração 04 não cobria). A IA acelerou a escrita; as decisões, a conferência no banco
real e a responsabilidade por cada linha continuaram comigo.
