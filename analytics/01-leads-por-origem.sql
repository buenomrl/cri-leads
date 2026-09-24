-- =====================================================================
-- Etapa 2 · pergunta 1: qual origem gerou mais leads?
-- =====================================================================
-- Rodar no SQL Editor do projeto. O resultado real esta colado abaixo.

select
  origem,
  count(*)                                              as leads,
  round(100.0 * count(*) / sum(count(*)) over (), 1)    as percentual
from public.leads
group by origem
order by leads desc;

-- ---------------------------------------------------------------------
-- RESULTADO
-- ---------------------------------------------------------------------
-- Rodado em 2026-09-24 no projeto cri-leads-br (sa-east-1), sobre o seed da migracao 02.
--
--    origem    | leads | percentual
--   -----------+-------+-----------
--    site      |    12 |       48.0
--    whatsapp  |     8 |       32.0
--    indicacao |     5 |       20.0
--
-- ---------------------------------------------------------------------
-- LEITURA
-- ---------------------------------------------------------------------
-- (ver analytics/resultados.md)
--
-- Nota sobre a consulta: `sum(count(*)) over ()` e uma window function
-- aplicada DEPOIS do group by — ela soma as contagens ja agregadas e da o
-- total geral em cada linha, evitando uma segunda passada na tabela ou uma
-- subquery so para calcular o denominador do percentual.
