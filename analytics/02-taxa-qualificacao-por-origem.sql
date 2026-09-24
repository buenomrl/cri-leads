-- =====================================================================
-- Etapa 2 · pergunta 2: percentual de leads qualificados em cada origem
-- =====================================================================

select
  origem,
  count(*)                                        as leads,
  count(*) filter (where status = 'qualificado')  as qualificados,
  round(
    100.0 * count(*) filter (where status = 'qualificado') / count(*),
    1
  )                                               as taxa_qualificacao_pct
from public.leads
group by origem
order by taxa_qualificacao_pct desc;

-- ---------------------------------------------------------------------
-- RESULTADO  (preenchido apos a execucao)
-- ---------------------------------------------------------------------
--
-- ---------------------------------------------------------------------
-- LEITURA
-- ---------------------------------------------------------------------
-- (ver analytics/resultados.md)
--
-- Notas sobre a consulta:
--
-- 1. `count(*) filter (where ...)` e a forma do Postgres para contagem
--    condicional. Faz o mesmo que `sum(case when ... then 1 else 0 end)` numa
--    passada so, e le melhor.
--
-- 2. O `100.0` (e nao `100`) forca aritmetica de ponto flutuante. Com inteiro,
--    `100 * 2 / 12` seria truncado para 16 em vez de 16.7 — e esse tipo de
--    erro passa despercebido porque o numero continua parecendo plausivel.
--
-- 3. Os MESMOS numeros sao calculados em TypeScript por `resumoDeLeads` em
--    supabase/functions/_shared/analytics.ts, que e o que alimenta a tela.
--    Ter os dois lados e proposital: um confere o outro. Se divergirem, um
--    dos dois esta errado.
