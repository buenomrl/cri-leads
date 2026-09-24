-- =====================================================================
-- Fecha o que o service_role herdou sem ninguem pedir
-- =====================================================================
-- As migracoes 01 e 03 concedem ao `service_role` exatamente o que a
-- aplicacao usa: `select, insert, update` em leads e `select, insert` em
-- agent_runs. Conferindo os grants no banco real, apareceram tambem
-- TRUNCATE, REFERENCES e TRIGGER nas duas tabelas.
--
-- DE ONDE VIERAM: dos privilegios padrao (`alter default privileges`) que o
-- Supabase configura no schema public — toda tabela nova ja nasce com eles
-- para o service_role. Nao estao em nenhum arquivo deste repo, e por isso
-- passariam despercebidos se ninguem olhasse o banco.
--
-- POR QUE IMPORTA: TRUNCATE e' um DELETE sem WHERE que nem passa por RLS.
-- A documentacao deste projeto afirma que nao existe caminho para apagar
-- lead em nenhuma camada; com TRUNCATE concedido, essa frase era falsa.
-- Privilegio que a aplicacao nao usa so' tem risco.
--
-- POR QUE `revoke all` + regrant, e nao revogar item por item: a lista do
-- que o padrao concede nao e' nossa, e muda — o Postgres 17 trouxe o
-- privilegio MAINTAIN, que nem aparece em information_schema. Zerar e
-- conceder de novo so' o necessario deixa o resultado igual ao que este
-- arquivo diz, independente do que foi herdado.
--
-- ⚠️ Tabela NOVA continua nascendo com os privilegios padrao. Toda migracao
-- que criar tabela precisa repetir este padrao (`revoke all` + grant minimo).
--
-- Colar no SQL Editor do projeto. Idempotente: pode rodar de novo.

begin;

revoke all on public.leads, public.agent_runs from service_role;

grant select, insert, update on public.leads      to service_role;
grant select, insert         on public.agent_runs to service_role;

commit;

-- Conferencia direto na ACL da tabela (inclui MAINTAIN, que o
-- information_schema nao mostra). Esperado:
--   agent_runs | INSERT, SELECT
--   leads      | INSERT, SELECT, UPDATE
--
--   select c.relname,
--          string_agg(a.privilege_type, ', ' order by a.privilege_type)
--   from pg_class c, aclexplode(c.relacl) a
--   where c.relnamespace = 'public'::regnamespace
--     and c.relname in ('leads', 'agent_runs')
--     and a.grantee = 'service_role'::regrole
--   group by c.relname;
