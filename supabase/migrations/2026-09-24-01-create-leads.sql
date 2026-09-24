-- =====================================================================
-- Etapa 1 · tabela de leads
-- =====================================================================
-- Rodar colando no SQL Editor do projeto. Idempotente o suficiente para
-- reexecutar em banco limpo; nao apaga dado existente.

create extension if not exists pgcrypto;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),

  nome text not null
    constraint leads_nome_tamanho check (length(btrim(nome)) between 2 and 120),

  telefone text not null
    constraint leads_telefone_tamanho check (length(btrim(telefone)) between 8 and 20),

  -- Texto livre, como pede o enunciado. E' tambem a entrada NAO CONFIAVEL do
  -- agente da Etapa 4: e' texto que veio da internet e vai parar dentro de um
  -- prompt. O limite de 1000 existe para isso, nao por estetica.
  imovel_interesse text not null
    constraint leads_imovel_tamanho check (length(btrim(imovel_interesse)) between 3 and 1000),

  -- Dominio fechado no BANCO, nao so' na aplicacao. Aplicacao valida para dar
  -- erro bonito; o banco valida para o dado nao poder existir errado.
  --
  -- Escolhi `text` + `check` em vez de um tipo ENUM de proposito: ENUM do
  -- Postgres so' cresce (adicionar valor e' fácil, remover ou reordenar exige
  -- recriar o tipo e todas as colunas que o usam). Para um dominio que pode
  -- mudar com o processo comercial, o check e' mais barato de evoluir e da' a
  -- mesma garantia de integridade.
  origem text not null
    constraint leads_origem_valida check (origem in ('site', 'whatsapp', 'indicacao')),

  status text not null default 'novo'
    constraint leads_status_valido check (status in ('novo', 'em_contato', 'qualificado', 'perdido')),

  created_at timestamptz not null default now()
);

comment on table public.leads is
  'Leads de captacao. Dados 100% ficticios (case tecnico). Ver SECURITY.md.';
comment on column public.leads.imovel_interesse is
  'Texto livre do lead. Entrada NAO CONFIAVEL do agente de IA: tratar sempre como dado, nunca como instrucao.';

-- Sem indice de proposito. A tabela tem ~25 linhas; indice aqui seria ruido e
-- nao mudaria plano nenhum. Com volume real: (status, created_at desc) para a
-- listagem padrao e (origem) para a rollup da analytics.


-- =====================================================================
-- Controle de acesso — DUAS camadas, e elas sao independentes
-- =====================================================================
-- No Supabase, alcancar uma tabela pela Data API (PostgREST) exige as duas
-- coisas ao mesmo tempo:
--   1. GRANT no role do Postgres  -> permissao de existir a operacao
--   2. policy de RLS que permita  -> permissao de alcancar a linha
-- Faltando qualquer uma, o acesso e' negado. Muita gente so' lembra da RLS.

alter table public.leads enable row level security;

-- Camada 1: GRANT. Nada para o publico.
-- `anon` e `authenticated` NAO recebem permissao alguma, entao nesta demo
-- simplesmente NAO EXISTE caminho pela Data API — nem para quem descobrisse a
-- anon key do projeto. O app inteiro passa por Edge Function.
revoke all on public.leads from anon, authenticated;

-- `service_role` so' e' alcancavel de dentro das Edge Functions (a chave e'
-- injetada no runtime e nunca sai do servidor). Sem DELETE: nenhum caminho da
-- aplicacao apaga lead, entao a permissao nao precisa existir.
grant select, insert, update on public.leads to service_role;

-- Camada 2: policies. Escritas de proposito, mesmo dormentes nesta demo.
--
-- Uma tabela com RLS ligada e ZERO policy funciona (a ausencia de policy sob
-- RLS *e'* o deny — e e' exatamente essa a propriedade da qual este projeto
-- depende), mas nao mostra o modelo de acesso pretendido. As policies abaixo
-- sao o desenho de PRODUCAO: quando houvesse Supabase Auth, bastaria conceder
-- o GRANT a `authenticated` e elas passariam a valer.
--
-- Enquanto o GRANT nao existir, este bloco nao e' alcancavel por ninguem — e' o
-- cinto junto do suspensorio, nao o unico controle.
create policy "leads: equipe le" on public.leads
  for select to authenticated using (true);

create policy "leads: equipe cria" on public.leads
  for insert to authenticated with check (true);

create policy "leads: equipe atualiza" on public.leads
  for update to authenticated using (true) with check (true);

-- Nao existe policy de DELETE, em nenhum role. Lead perdido vira
-- status = 'perdido'; historico comercial nao se apaga.

-- Em producao multi-imobiliaria o `using (true)` acima viraria o recorte por
-- tenant, sem mudar mais nada na aplicacao:
--   using (imobiliaria_id = (auth.jwt() ->> 'imobiliaria_id')::uuid)
-- Nao adicionei a coluna porque este case tem um cliente so' e a coluna
-- custaria um dia para provar uma frase.
