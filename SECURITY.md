# Segurança

Uma página: o que este projeto protege, **o que ele não protege**, e o que seria diferente em
produção.

## O desenho em uma frase

O navegador não recebe nenhuma credencial de banco. A tela fala só com duas Edge Functions, e todo
segredo (acesso ao banco com `service_role`, chave da Anthropic, chave de demonstração) existe apenas
no servidor.

## O que está protegido, e por quê

| Ameaça | Defesa | Onde |
|---|---|---|
| Alguém consultar ou alterar o banco direto pela API do Supabase | `anon` e `authenticated` sem nenhum `GRANT`; RLS ligada; o front não tem chave do Supabase | `migrations/01`, `03`, `04` |
| Alguém apagar dados | Nenhum papel usado pela aplicação pode apagar: não há rota, permissão nem policy de `DELETE`. O `TRUNCATE` que o Supabase concede por padrão foi revogado. (O dono do banco, no painel do Supabase, continua podendo.) | `migrations/01`, `03`, `04` |
| Qualquer visitante alterar a base ou gastar crédito de IA | Escrita exige o cabeçalho `x-demo-key`, comparado em tempo constante no servidor | `_server/demo-key.ts`, `_shared/secure-compare.ts` |
| Dado inválido | Validação no servidor e `check` no banco por trás dela | `_shared/validation.ts` |
| Exposição de telefone | A listagem pública só devolve o número mascarado (`(11) 9****-**34`) | `_shared/phone.ts` |
| Prompt injection pelo texto do lead | Texto marcado como dado não confiável; a extração só devolve campos fixos, que são saneados; a redação vê só o primeiro nome e esses campos, nunca o texto do imóvel; o guard recusa link, e-mail, telefone de terceiro, instrução vazada e mensagem vazia, curta ou longa demais; a mensagem é sempre revisada por uma pessoa | `agent-first-message/`, `_shared/output-guard.ts` |
| Resposta de IA cortada ou recusada virar mensagem | Só `stop_reason: end_turn` é aceito; o resto cai no fallback determinístico | `_shared/model-response.ts` |
| Conta da IA virar cartão aberto | Teto global de 200 gerações por dia, contado no banco, e saldo pré-pago sem recarga automática | `agent-first-message/`, console da Anthropic |
| Vazamento de detalhe interno em erro | Erro inesperado sai sempre como `500 erro interno`; detalhe só no log do servidor | `_server/http.ts` |
| Site embutido em outro, script de terceiros | CSP restrita, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` | `vercel.json` |
| Segredo no repositório | Segredos só em `supabase secrets` e na Vercel; nenhuma variável `VITE_*` é segredo; histórico do git verificado antes de tornar o repo público | `.gitignore`, `.env.example` |

Cada regra acima que é código tem teste (`npm test`), e o comportamento da API publicada é conferido
por `npm run smoke`.

## O que NÃO está protegido (riscos aceitos)

- **A chave de demonstração não é autenticação.** É uma chave única e compartilhada: não identifica
  quem usou, não expira e não se revoga por pessoa. Existe porque o enunciado dispensa login e a
  avaliação precisa funcionar sem cadastro.
- **A listagem é pública.** Quem tiver a URL vê nomes e o texto de interesse dos leads. O que protege
  aqui é o dado ser **fictício**, não o sistema. Com dado real, isso seria inaceitável.
- **CORS é higiene, não controle de acesso.** Ele impede que outro site leia a API pelo navegador de
  alguém; não impede `curl` nem script. Quem controla a escrita é a chave.
- **Não há limite por IP.** O cabeçalho de IP pode ser forjado e trocar de IP é grátis; o teto diário
  global é o controle que realmente segura o custo.
- **Nenhuma defesa torna prompt injection impossível.** As camadas reduzem o que uma injeção consegue;
  a revisão humana antes do envio é a última barreira, e é por isso que o sistema nunca envia nada.

## Em produção seria diferente

- **Login por usuário** (Supabase Auth) no lugar da chave, com papéis (SDR, gestor), lead com
  responsável e **RLS filtrando pelo usuário logado**. As policies para isso já estão escritas na
  migração 01, dormentes até existir o `GRANT`.
- **Leitura também autenticada**, e telefone completo visível só para o responsável pelo lead.
- **Registro de auditoria** de quem mudou o quê, e das mensagens que a IA sugeriu.
- **Entrada de leads pelo site e pelo WhatsApp** com defesa própria: anti-spam no formulário e
  verificação de assinatura nos avisos (*webhooks*) da API oficial do WhatsApp.
- **LGPD:** consentimento para contato no formulário e política de retenção dos dados.
