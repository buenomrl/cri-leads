-- =====================================================================
-- Etapa 4 · registro de execucoes do agente
-- =====================================================================
-- Esta tabela faz DOIS trabalhos, e o segundo e' o que justifica ela existir
-- num case de 3 dias:
--   1. observabilidade — que modelo rodou, com qual versao de prompt, quanto
--      demorou, quantos tokens, e o que o guard de saida decidiu;
--   2. e' o CONTADOR do teto diario de chamadas. Sem teto, um endpoint publico
--      de IA e' um cartao de credito aberto na internet.
--
-- Nao guarda o texto gerado nem o texto do lead: o que interessa aqui e'
-- metrica e veredito, e menos dado guardado e' menos dado para vazar.

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),

  -- Pode ser nulo: o painel do agente permite gerar mensagem para um lead
  -- hipotetico (inclusive o botao de entrada hostil), sem gravar lead nenhum.
  lead_id uuid references public.leads(id) on delete set null,

  modelo text not null,

  -- Versao do arquivo de prompt que rodou. Trocar o prompt e nao versionar e'
  -- como trocar schema sem migracao: depois ninguem sabe o que gerou o quê.
  prompt_versao text not null,

  -- 'ok'            -> passou no guard
  -- 'bloqueado'     -> guard rejeitou a saida do modelo, caiu no fallback
  -- 'erro_provedor' -> API falhou, caiu no fallback
  veredito text not null
    constraint agent_runs_veredito_valido check (veredito in ('ok', 'bloqueado', 'erro_provedor')),

  -- Preenchido quando veredito <> 'ok'. Texto curto do motivo, nao o conteudo.
  motivo text
    constraint agent_runs_motivo_tamanho check (motivo is null or length(motivo) <= 200),

  latencia_ms integer
    constraint agent_runs_latencia_positiva check (latencia_ms is null or latencia_ms >= 0),
  tokens_entrada integer,
  tokens_saida integer,

  created_at timestamptz not null default now()
);

comment on table public.agent_runs is
  'Metrica e veredito de cada execucao do agente. Tambem e o contador do teto diario.';

-- Este indice SE JUSTIFICA, ao contrario dos que nao criei em `leads`: o teto
-- diario consulta `where created_at >= date_trunc('day', now())` a CADA
-- chamada do agente, e essa tabela cresce sem teto.
create index if not exists agent_runs_created_at_idx
  on public.agent_runs (created_at desc);

-- Mesmo desenho de acesso de `leads`: nada para o publico, o minimo para o
-- servidor. Aqui nem UPDATE entra — registro de execucao nao se corrige.
alter table public.agent_runs enable row level security;
revoke all on public.agent_runs from anon, authenticated;
grant select, insert on public.agent_runs to service_role;

-- Modelo de producao, dormente enquanto nao existir o GRANT (ver a migracao 01).
create policy "agent_runs: equipe le" on public.agent_runs
  for select to authenticated using (true);
