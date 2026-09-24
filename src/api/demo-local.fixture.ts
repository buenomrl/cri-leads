// Os 25 leads do seed, para o modo local.
//
// ⚠️ COPIA de supabase/migrations/2026-09-24-02-seed-leads.sql. A fonte da
// verdade e' a migracao; isto existe so' para o front rodar antes do banco
// existir. Se o seed mudar, mude aqui tambem — os numeros da tela local
// devem bater com analytics/resultados.md.
//
// Mesmo formato do seed: [nome, telefone, imovel_interesse, origem, status, dias atras].

import type { Lead, Origem, Status } from '@shared/domain.ts';

type Linha = [string, string, string, Origem, Status, number];

const SEED: Linha[] = [
  // origem: site (12 leads, 2 qualificados)
  ['Ana Beatriz Salgado', '(11) 90114-2207', 'Apartamento 3 dormitórios no Itaim Bibi, até R$ 4,5 milhões, com 2 vagas', 'site', 'qualificado', 49],
  ['Ricardo Menezes Prado', '(11) 90233-8814', 'Procuro apartamento em São Paulo', 'site', 'perdido', 52],
  ['Juliana Ferraz Coutinho', '(11) 90347-1165', 'Cobertura duplex em Vila Nova Conceição, mínimo 250 m², 4 suítes', 'site', 'qualificado', 41],
  ['Marcelo Tavares Lima', '(11) 90452-6093', 'Tenho interesse em imóveis de alto padrão', 'site', 'novo', 6],
  ['Patrícia Nogueira Alves', '(11) 90519-4472', 'Casa em condomínio fechado no Morumbi, 4 suítes, faixa de R$ 8 milhões', 'site', 'em_contato', 33],
  ['Eduardo Camargo Ribeiro', '(11) 90628-3351', 'Quero saber valores', 'site', 'perdido', 45],
  ['Fernanda Seixas Moreira', '(11) 90733-9028', 'Apartamento nos Jardins, 2 dormitórios, para investimento', 'site', 'em_contato', 27],
  ['Gustavo Pinheiro Bastos', '(11) 90846-7719', 'Gostaria de receber o catálogo', 'site', 'novo', 3],
  ['Camila Rezende Figueiredo', '(11) 90955-2264', 'Apartamento em Pinheiros ou Vila Madalena, 3 dorms, até R$ 2,8 mi', 'site', 'em_contato', 19],
  ['Leonardo Arruda Peixoto', '(11) 90162-8830', 'Imóvel para morar', 'site', 'perdido', 38],
  ['Helena Bandeira Cruz', '(11) 90274-5506', 'Interesse em lançamento em Perdizes', 'site', 'novo', 11],
  ['Thiago Monteiro Vasques', '(11) 90388-1147', 'Apartamento garden em Moema, 3 suítes, até R$ 5 mi, entrega até 2027', 'site', 'novo', 2],

  // origem: whatsapp (8 leads, 2 qualificados)
  ['Rodrigo Sampaio Queiroz', '(11) 90491-7723', 'Vi o anúncio do apartamento no Brooklin, 3 dorms, 140 m², quero visitar', 'whatsapp', 'qualificado', 14],
  ['Mariana Lacerda Pontes', '(11) 90536-2298', 'Oi, tudo bem? Queria informações', 'whatsapp', 'novo', 4],
  ['Felipe Andrade Castilho', '(11) 90645-8810', 'Apartamento Alto de Pinheiros, 4 dormitórios, até R$ 6,5 milhões', 'whatsapp', 'qualificado', 9],
  ['Renata Bicalho Furtado', '(11) 90758-3341', 'Procuro apto 2 quartos no Campo Belo para alugar, até R$ 9 mil por mês', 'whatsapp', 'em_contato', 21],
  ['Bruno Vasconcelos Teles', '(11) 90863-9975', 'Me manda mais detalhes por favor', 'whatsapp', 'perdido', 30],
  ['Larissa Quintela Braga', '(11) 90977-4402', 'Casa no Jardim Europa, 5 suítes, piscina, orçamento aberto', 'whatsapp', 'em_contato', 16],
  ['Vinícius Aragão Sodré', '(11) 90185-6634', 'Boa tarde', 'whatsapp', 'novo', 1],
  ['Isabela Drummond Xavier', '(11) 90296-1158', 'Apartamento em Higienópolis, prédio antigo com pé-direito alto', 'whatsapp', 'em_contato', 24],

  // origem: indicacao (5 leads, 3 qualificados)
  ['Otávio Bressane Caldeira', '(11) 90312-7786', 'Indicado pela Dra. Marina. Cobertura no Itaim, 300 m², até R$ 12 milhões', 'indicacao', 'qualificado', 35],
  ['Sofia Rangel Albuquerque', '(11) 90428-5519', 'Cliente do Sr. Paulo indicou. Apartamento Vila Olímpia, 3 suítes, 180 m²', 'indicacao', 'qualificado', 22],
  ['Henrique Portela Maciel', '(11) 90534-2263', 'Indicação do meu sócio, procuro apartamento na região dos Jardins', 'indicacao', 'qualificado', 12],
  ['Beatriz Galvão Sarmento', '(11) 90647-8891', 'Amiga comprou com vocês e indicou', 'indicacao', 'novo', 5],
  ['André Lousada Guimarães', '(11) 90751-3320', 'Indicado. Terreno em condomínio em Alphaville, mínimo 1.200 m²', 'indicacao', 'em_contato', 29],
];

const DIA_MS = 24 * 60 * 60 * 1000;

/** Leads com telefone CHEIO — a mascara e' aplicada na "rota", como no servidor. */
export function leadsIniciais(agora = Date.now()): Lead[] {
  return SEED.map(([nome, telefone, imovel_interesse, origem, status, dias], i) => ({
    // uuid v4 valido e deterministico, para passar no validarMudancaStatus.
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    nome,
    telefone,
    imovel_interesse,
    origem,
    status,
    created_at: new Date(agora - dias * DIA_MS).toISOString(),
  }));
}
