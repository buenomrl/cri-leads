# Etapa 2 · Interpretação dos dados

Consultas rodadas em 2026-09-24 no banco publicado (`cri-leads-br`, Postgres 17, `sa-east-1`),
sobre os 25 leads do seed. Cada consulta está em um arquivo `.sql` desta pasta, com o resultado
colado embaixo dela.

> **Sobre os dados, antes de tudo.** Os 25 leads são fictícios e o seed **foi desenhado** para
> conter padrões: dado sorteado não chega a conclusão nenhuma, e a Etapa 2 pede uma. Então o
> que segue não é descoberta sobre o mercado; é a demonstração de que as consultas encontram
> e isolam um padrão quando ele existe. Com n=25, um lead a mais ou a menos move qualquer taxa
> em 4 a 20 pontos percentuais. Os números indicam direção, não têm significância estatística.

---

## 1. Qual origem gerou mais leads?

`01-leads-por-origem.sql`

| Origem | Leads | % do total |
|---|---:|---:|
| Site | 12 | 48,0% |
| WhatsApp | 8 | 32,0% |
| Indicação | 5 | 20,0% |

**O site gera quase metade dos leads.**

## 2. Qual a taxa de qualificação por origem?

`02-taxa-qualificacao-por-origem.sql`

| Origem | Leads | Qualificados | Taxa |
|---|---:|---:|---:|
| Indicação | 5 | 3 | **60,0%** |
| WhatsApp | 8 | 2 | 25,0% |
| Site | 12 | 2 | **16,7%** |

**Volume e qualidade estão em ordem inversa.** A origem que mais traz leads é a que menos
qualifica, e a que menos traz é a que mais qualifica. Os três canais entregam praticamente o
mesmo número absoluto de qualificados (2, 2 e 3). O volume extra do site não vira venda: vira
fila.

## 3. Algum outro padrão relevante?

`03-detalhe-vs-qualificacao.sql`

Sim, e ele não depende da origem. **Depende de quanto o lead escreveu.** A regra usada é
simples de propósito: o pedido é "detalhado" se o texto cita algum número (metragem,
dormitórios, faixa de preço). Ela é grosseira e tem falsos negativos conhecidos.
"Apartamento em Higienópolis, prédio antigo com pé-direito alto" e "procuro apartamento na
região dos Jardins" dizem o que querem sem citar número e contam como vagos. O segundo, aliás,
qualificou: é o único qualificado do grupo "vago". A troca é consciente. Uma regra que qualquer
pessoa confere no SQL vale mais aqui do que uma classificação semântica que ninguém consegue
reproduzir. Com esses dois contados como detalhados, o padrão fica mais forte, não mais fraco.

| Tipo de pedido | Leads | Qualificados | Taxa |
|---|---:|---:|---:|
| Detalhado ("3 dorms no Itaim, até R$ 4,5 mi") | 13 | 6 | **46,2%** |
| Vago ("quero informações", "boa tarde") | 12 | 1 | **8,3%** |

Três cortes sustentam o padrão:

- **Ele se repete dentro de cada origem.** Detalhado contra vago dá 2/6 contra 0/6 no site,
  2/4 contra 0/4 no WhatsApp e 2/3 contra 1/2 na indicação. A proporção de pedidos detalhados
  também é parecida entre os canais (50–60%, consulta 3c). Logo, o efeito não é a origem
  aparecendo de outra forma.
- **Os 4 leads perdidos são todos vagos.**
- **6 dos 7 leads ainda em "novo" são vagos.** A fila que ninguém atendeu é justamente a de
  quem ainda não disse o que quer.

## Conclusão para o negócio

1. **A métrica que importa é lead qualificado por canal, não lead por canal.** Medido por
   volume, o site é o melhor canal. Em qualificados absolutos, ele empata com os outros (2, 2
   e 3). Por taxa, é o pior (16,7%): pede mais atendimento para cada lead qualificado que
   produz. Se houver investimento em mídia, a comparação justa é custo por lead
   **qualificado**.
2. **Lead vago não é lead ruim; é lead ainda não perguntado.** Um pedido vago qualifica pouco
   porque a conversa para antes de começar. Isso define o que a primeira mensagem precisa
   fazer: não é confirmar recebimento, é **fazer a única pergunta que falta**, a primeira
   lacuna na ordem região → orçamento → dormitórios → prazo → financiamento → visita.
   É exatamente o que o agente da Etapa 4 faz. Esse achado é a justificativa do desenho dele.

## Conferência cruzada

Os mesmos números são calculados de forma independente em TypeScript por `resumoDeLeads`
(`supabase/functions/_shared/analytics.ts`), que alimenta a tela e é coberto pelos testes do
Vitest. A regra de "detalhado" existe nos dois lados: `imovel_interesse ~ '[0-9]'` no SQL e
`temDetalhe` no TypeScript. Em 2026-09-24 os dois lados deram resultados idênticos: 16,7 / 25,0 /
60,0 por origem e 46,2 / 8,3 por tipo de pedido. Se um dia divergirem, um dos dois está errado.
