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
-- RESULTADO  (preenchido apos a execucao)
-- ---------------------------------------------------------------------
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
