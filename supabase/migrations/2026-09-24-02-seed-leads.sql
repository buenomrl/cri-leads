-- =====================================================================
-- Etapa 1 · seed de 25 leads ficticios
-- =====================================================================
-- Idempotente: so' insere se a tabela estiver vazia (o `where not exists` tem
-- subquery nao correlacionada, entao vale para o lote inteiro).
--
-- SOBRE OS DADOS: sao 100% ficticios. Nomes inventados, e os telefones usam o
-- bloco `9 0XXXX` — celular brasileiro real e' 9 seguido de 6, 7, 8 ou 9, entao
-- 90XXX-XXXX tem forma de telefone sem corresponder a assinante em uso. Ainda
-- assim a rota de listagem devolve o telefone MASCARADO: a demo nunca precisa
-- do numero inteiro para provar o que precisa provar.
--
-- SOBRE O DESENHO: este seed NAO e' aleatorio. Ele foi construido para conter
-- dois padroes que a Etapa 2 encontra por consulta, porque dado sorteado nao
-- produz conclusao nenhuma e a Etapa 2 pede uma. Os padroes estao em
-- analytics/resultados.md — e o segundo deles e' a justificativa do agente da
-- Etapa 4 existir na forma em que existe.

insert into public.leads (nome, telefone, imovel_interesse, origem, status, created_at)
select * from (values

  -- ---------- origem: site (12 leads, 2 qualificados) ----------
  ('Ana Beatriz Salgado',      '(11) 90114-2207', 'Apartamento 3 dormitórios no Itaim Bibi, até R$ 4,5 milhões, com 2 vagas',        'site',      'qualificado', now() - interval '49 days'),
  ('Ricardo Menezes Prado',    '(11) 90233-8814', 'Procuro apartamento em São Paulo',                                                'site',      'perdido',     now() - interval '52 days'),
  ('Juliana Ferraz Coutinho',  '(11) 90347-1165', 'Cobertura duplex em Vila Nova Conceição, mínimo 250 m², 4 suítes',                'site',      'qualificado', now() - interval '41 days'),
  ('Marcelo Tavares Lima',     '(11) 90452-6093', 'Tenho interesse em imóveis de alto padrão',                                       'site',      'novo',        now() - interval '6 days'),
  ('Patrícia Nogueira Alves',  '(11) 90519-4472', 'Casa em condomínio fechado no Morumbi, 4 suítes, faixa de R$ 8 milhões',          'site',      'em_contato',  now() - interval '33 days'),
  ('Eduardo Camargo Ribeiro',  '(11) 90628-3351', 'Quero saber valores',                                                             'site',      'perdido',     now() - interval '45 days'),
  ('Fernanda Seixas Moreira',  '(11) 90733-9028', 'Apartamento nos Jardins, 2 dormitórios, para investimento',                       'site',      'em_contato',  now() - interval '27 days'),
  ('Gustavo Pinheiro Bastos',  '(11) 90846-7719', 'Gostaria de receber o catálogo',                                                  'site',      'novo',        now() - interval '3 days'),
  ('Camila Rezende Figueiredo','(11) 90955-2264', 'Apartamento em Pinheiros ou Vila Madalena, 3 dorms, até R$ 2,8 mi',               'site',      'em_contato',  now() - interval '19 days'),
  ('Leonardo Arruda Peixoto',  '(11) 90162-8830', 'Imóvel para morar',                                                               'site',      'perdido',     now() - interval '38 days'),
  ('Helena Bandeira Cruz',     '(11) 90274-5506', 'Interesse em lançamento em Perdizes',                                             'site',      'novo',        now() - interval '11 days'),
  ('Thiago Monteiro Vasques',  '(11) 90388-1147', 'Apartamento garden em Moema, 3 suítes, até R$ 5 mi, entrega até 2027',            'site',      'novo',        now() - interval '2 days'),

  -- ---------- origem: whatsapp (8 leads, 2 qualificados) ----------
  ('Rodrigo Sampaio Queiroz',  '(11) 90491-7723', 'Vi o anúncio do apartamento no Brooklin, 3 dorms, 140 m², quero visitar',         'whatsapp',  'qualificado', now() - interval '14 days'),
  ('Mariana Lacerda Pontes',   '(11) 90536-2298', 'Oi, tudo bem? Queria informações',                                                'whatsapp',  'novo',        now() - interval '4 days'),
  ('Felipe Andrade Castilho',  '(11) 90645-8810', 'Apartamento Alto de Pinheiros, 4 dormitórios, até R$ 6,5 milhões',                'whatsapp',  'qualificado', now() - interval '9 days'),
  ('Renata Bicalho Furtado',   '(11) 90758-3341', 'Procuro apto 2 quartos no Campo Belo para alugar, até R$ 9 mil por mês',          'whatsapp',  'em_contato',  now() - interval '21 days'),
  ('Bruno Vasconcelos Teles',  '(11) 90863-9975', 'Me manda mais detalhes por favor',                                                'whatsapp',  'perdido',     now() - interval '30 days'),
  ('Larissa Quintela Braga',   '(11) 90977-4402', 'Casa no Jardim Europa, 5 suítes, piscina, orçamento aberto',                      'whatsapp',  'em_contato',  now() - interval '16 days'),
  ('Vinícius Aragão Sodré',    '(11) 90185-6634', 'Boa tarde',                                                                       'whatsapp',  'novo',        now() - interval '1 days'),
  ('Isabela Drummond Xavier',  '(11) 90296-1158', 'Apartamento em Higienópolis, prédio antigo com pé-direito alto',                  'whatsapp',  'em_contato',  now() - interval '24 days'),

  -- ---------- origem: indicacao (5 leads, 3 qualificados) ----------
  ('Otávio Bressane Caldeira', '(11) 90312-7786', 'Indicado pela Dra. Marina. Cobertura no Itaim, 300 m², até R$ 12 milhões',        'indicacao', 'qualificado', now() - interval '35 days'),
  ('Sofia Rangel Albuquerque', '(11) 90428-5519', 'Cliente do Sr. Paulo indicou. Apartamento Vila Olímpia, 3 suítes, 180 m²',        'indicacao', 'qualificado', now() - interval '22 days'),
  ('Henrique Portela Maciel',  '(11) 90534-2263', 'Indicação do meu sócio, procuro apartamento na região dos Jardins',               'indicacao', 'qualificado', now() - interval '12 days'),
  ('Beatriz Galvão Sarmento',  '(11) 90647-8891', 'Amiga comprou com vocês e indicou',                                               'indicacao', 'novo',        now() - interval '5 days'),
  ('André Lousada Guimarães',  '(11) 90751-3320', 'Indicado. Terreno em condomínio em Alphaville, mínimo 1.200 m²',                  'indicacao', 'em_contato',  now() - interval '29 days')

) as v(nome, telefone, imovel_interesse, origem, status, created_at)
where not exists (select 1 from public.leads);

-- Conferencia rapida depois de rodar (o esperado esta' em analytics/resultados.md):
--   select count(*) from public.leads;                        -- 25
--   select origem, count(*) from public.leads group by 1;     -- site 12, whatsapp 8, indicacao 5
--   select status, count(*) from public.leads group by 1;     -- novo 7, em_contato 7, qualificado 7, perdido 4
