// Tela unica com dois estados: o painel de leads e o agente de um lead.
// Sem router de proposito — duas telas nao pagam uma dependencia.

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Lead, Status } from '@shared/domain.ts';
import type { NovoLead } from '@shared/validation.ts';

import { MODO_LOCAL, obterApi } from './api/client.ts';
import { ErroApi, type ListaResposta } from './api/types.ts';
import { AgentPanel } from './components/AgentPanel.tsx';
import { DemoKeyDialog } from './components/DemoKeyDialog.tsx';
import { LeadSearch } from './components/LeadSearch.tsx';
import { LeadsTable } from './components/LeadsTable.tsx';
import { NewLeadDialog } from './components/NewLeadDialog.tsx';
import { OrigemChart } from './components/OrigemChart.tsx';
import { StatusFilter, type Filtro } from './components/StatusFilter.tsx';
import { SummaryTiles } from './components/SummaryTiles.tsx';
import { TopBar } from './components/TopBar.tsx';
import { apagarChaveDemo, lerChaveDemo, salvarChaveDemo } from './demo-key.ts';
import { buscarLeads, ordenarLeads, proximaOrdem, type Ordem } from './lead-list.ts';
import { comTransicao } from './transicao.ts';

const DIA_MS = 24 * 60 * 60 * 1000;

export function App() {
  const [dados, setDados] = useState<ListaResposta | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  // Dois estados de busca: `busca` e' o texto do campo (atualiza na hora, senao o
  // cursor pula); `buscaAplicada` e' o que filtra a lista, e muda DENTRO da
  // transicao — ver transicao.ts.
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [ordem, setOrdem] = useState<Ordem>(null);
  const [chave, setChave] = useState<string | null>(lerChaveDemo);
  const [pedindoChave, setPedindoChave] = useState(false);
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState<ReadonlySet<string>>(new Set());
  const [recemSalvo, setRecemSalvo] = useState<string | null>(null);
  const [leadDoAgente, setLeadDoAgente] = useState<Lead | null>(null);

  const carregar = useCallback(async () => {
    try {
      const api = await obterApi();
      setDados(await api.listar());
      setErro(null);
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar os leads.');
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  function guardarChave(nova: string) {
    salvarChaveDemo(nova);
    setChave(nova);
    setPedindoChave(false);
  }

  function travar() {
    apagarChaveDemo();
    setChave(null);
  }

  /** Converte erro de escrita em mensagem; 401 derruba a chave guardada. */
  function tratarErroEscrita(e: unknown, padrao: string) {
    if (e instanceof ErroApi && e.status === 401) {
      travar();
      setErro('A chave de demonstração foi recusada pelo servidor. Destrave de novo.');
    } else {
      setErro(e instanceof ErroApi ? e.message : padrao);
    }
  }

  async function criar(novo: NovoLead) {
    if (!chave) {
      // A chave pode ter caido com o dialogo aberto (401 em outra acao).
      setCriando(false);
      setPedindoChave(true);
      return;
    }
    setErro(null);
    const api = await obterApi();
    try {
      await api.criar(novo, chave);
    } catch (e) {
      if (e instanceof ErroApi && e.status === 401) {
        tratarErroEscrita(e, '');
        setCriando(false);
        return;
      }
      throw e; // 400 volta para o formulario mostrar os detalhes
    }
    setCriando(false);
    setFiltro('todos');
    await carregar();
  }

  async function mudarStatus(lead: Lead, status: Status) {
    if (!chave || status === lead.status) return;
    setErro(null);
    setSalvando((atual) => new Set(atual).add(lead.id));
    try {
      const api = await obterApi();
      await api.mudarStatus(lead.id, status, chave);
      await carregar();
      // Brilho breve na linha salva: confirma sem precisar de aviso na tela.
      setRecemSalvo(lead.id);
      setTimeout(() => setRecemSalvo((atual) => (atual === lead.id ? null : atual)), 1200);
    } catch (e) {
      tratarErroEscrita(e, 'Não foi possível atualizar o status.');
    } finally {
      setSalvando((atual) => {
        const proximo = new Set(atual);
        proximo.delete(lead.id);
        return proximo;
      });
    }
  }

  function abrirAgente(lead: Lead | null) {
    setErro(null);
    setLeadDoAgente(lead);
  }

  // Filtro de status -> busca livre -> ordenacao. As pilulas de status seguem
  // contando a base inteira (vem do resumo do servidor), nao o resultado da busca.
  const doStatus = useMemo(
    () => (dados ? dados.leads.filter((l) => filtro === 'todos' || l.status === filtro) : []),
    [dados, filtro],
  );
  const visiveis = useMemo(
    () => ordenarLeads(buscarLeads(doStatus, buscaAplicada), ordem),
    [doStatus, buscaAplicada, ordem],
  );

  const periodoDias = useMemo(() => {
    if (!dados?.leads.length) return 0;
    const maisAntigo = Math.min(...dados.leads.map((l) => Date.parse(l.created_at)));
    return Math.max(1, Math.ceil((Date.now() - maisAntigo) / DIA_MS));
  }, [dados]);

  return (
    <>
      {MODO_LOCAL && (
        <div className="faixa-local">
          Modo local · dados em memória, sem banco e sem modelo. Validação, resumo e guard são os reais.
        </div>
      )}
      <TopBar
        escritaLiberada={chave !== null}
        onInicio={() => abrirAgente(null)}
        onDestravar={() => setPedindoChave(true)}
        onTravar={travar}
      />

      {leadDoAgente ? (
        <AgentPanel
          key={leadDoAgente.id}
          lead={leadDoAgente}
          chave={chave}
          onPedirChave={() => setPedindoChave(true)}
          onChaveRecusada={travar}
          onVoltar={() => abrirAgente(null)}
        />
      ) : (
        <main className="pagina">
          <div className="cabecalho">
            <div>
              <h1>Captação de leads</h1>
              {dados && (
                <p className="num">
                  {dados.resumo.total} registros · últimos {periodoDias} dias · dados fictícios
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn-primario"
              onClick={() => (chave ? setCriando(true) : setPedindoChave(true))}
              title={chave ? undefined : 'Exige a chave de demonstração'}
            >
              Novo lead
            </button>
          </div>

          {erro && <div className="aviso" role="alert">{erro}</div>}
          {!dados && !erro && <p className="carregando">Carregando leads…</p>}

          {dados && (
            <>
              <SummaryTiles resumo={dados.resumo} />
              <OrigemChart resumo={dados.resumo} />
              <section style={{ display: 'flex', flexDirection: 'column', gap: 18 }} aria-label="Leads">
                <StatusFilter
                  filtro={filtro}
                  total={dados.resumo.total}
                  porStatus={dados.resumo.porStatus}
                  onMudar={(f) => comTransicao(() => setFiltro(f))}
                />
                <LeadSearch
                  termo={busca}
                  mostrando={visiveis.length}
                  total={doStatus.length}
                  onMudar={(termo) => {
                    setBusca(termo);
                    comTransicao(() => setBuscaAplicada(termo), 'busca');
                  }}
                />
                <LeadsTable
                  leads={visiveis}
                  escritaLiberada={chave !== null}
                  salvando={salvando}
                  ordem={ordem}
                  busca={buscaAplicada}
                  chaveLista={`${filtro}|${ordem?.coluna ?? ''}|${ordem?.direcao ?? ''}`}
                  recemSalvo={recemSalvo}
                  onOrdenar={(coluna) => comTransicao(() => setOrdem((atual) => proximaOrdem(atual, coluna)))}
                  onMudarStatus={mudarStatus}
                  onAbrirAgente={abrirAgente}
                />
              </section>
            </>
          )}
        </main>
      )}

      {/* O site e' publico e usa o logo da CRI: o aviso evita que alguem o
          confunda com um sistema oficial deles. */}
      <footer className="rodape">
        <div className="rodape-dentro">
          <span>
            Projeto de avaliação técnica para a CRI Soluções Imobiliárias · não é um sistema oficial ·
            dados fictícios
          </span>
          <span className="rodape-links">
            <a href="/docs/">Documentação</a>
            <a href="https://github.com/buenomrl/cri-leads" target="_blank" rel="noreferrer">
              Código no GitHub
            </a>
          </span>
        </div>
      </footer>

      <DemoKeyDialog
        aberto={pedindoChave}
        modoLocal={MODO_LOCAL}
        onFechar={() => setPedindoChave(false)}
        onSalvar={guardarChave}
      />
      <NewLeadDialog aberto={criando} onFechar={() => setCriando(false)} onCriar={criar} />
    </>
  );
}
