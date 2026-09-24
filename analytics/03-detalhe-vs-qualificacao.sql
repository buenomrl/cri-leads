-- =====================================================================
-- Etapa 2 · pergunta 3: algum outro padrao relevante nos dados?
-- =====================================================================
-- O padrao que este arquivo isola: NAO e de onde o lead veio, e QUANTO ele
-- disse. Lead que descreveu o que quer com algum numero (metragem,
-- dormitorios, faixa de preco) qualifica muito mais do que lead que so
-- escreveu "quero informacoes".
--
-- ⚠️ A regra `imovel_interesse ~ '[0-9]'` e espelhada em `temDetalhe` em
-- supabase/functions/_shared/analytics.ts. Se uma mudar sem a outra, a tela
-- passa a mostrar um numero diferente do que esta consulta prova.

-- --- 3a. o padrao ----------------------------------------------------
select
  case
    when imovel_interesse ~ '[0-9]' then 'pedido detalhado'
    else 'pedido vago'
  end                                             as tipo_pedido,
  count(*)                                        as leads,
  count(*) filter (where status = 'qualificado')  as qualificados,
  round(
    100.0 * count(*) filter (where status = 'qualificado') / count(*),
    1
  )                                               as taxa_qualificacao_pct
from public.leads
group by tipo_pedido
order by taxa_qualificacao_pct desc;

-- --- 3b. evidencia de apoio: origem x status --------------------------
-- Serve para checar se o padrao de 3a nao e so a origem disfarcada.
select
  origem,
  count(*) filter (where status = 'novo')         as novo,
  count(*) filter (where status = 'em_contato')   as em_contato,
  count(*) filter (where status = 'qualificado')  as qualificado,
  count(*) filter (where status = 'perdido')      as perdido,
  count(*)                                        as total
from public.leads
group by origem
order by total desc;

-- --- 3c. o detalhamento dentro de cada origem -------------------------
select
  origem,
  count(*) filter (where imovel_interesse ~ '[0-9]')      as pedidos_detalhados,
  count(*)                                                as leads,
  round(
    100.0 * count(*) filter (where imovel_interesse ~ '[0-9]') / count(*),
    1
  )                                                       as pct_detalhado
from public.leads
group by origem
order by pct_detalhado desc;

-- ---------------------------------------------------------------------
-- RESULTADO  (preenchido apos a execucao)
-- ---------------------------------------------------------------------
--
-- ---------------------------------------------------------------------
-- LEITURA
-- ---------------------------------------------------------------------
-- (ver analytics/resultados.md)
