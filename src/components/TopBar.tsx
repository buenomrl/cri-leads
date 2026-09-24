// Logo: tirado do PDF do case que a propria CRI enviou (nada baixado do site
// deles). No cabecalho vai a versao de UMA COR, na cor do texto — combina com o
// ambiente sobrio, e o laranja da marca aparece nos detalhes da interface. A
// versao colorida (cri-logo.png) fica no repo para trocar com uma linha.
import logo from '../assets/cri-logo-tinta.png';

interface Props {
  escritaLiberada: boolean;
  onInicio: () => void;
  onDestravar: () => void;
  onTravar: () => void;
}

export function TopBar({ escritaLiberada, onInicio, onDestravar, onTravar }: Props) {
  return (
    <header className="topo">
      <div className="topo-dentro">
        <button type="button" className="marca" onClick={onInicio} aria-label="Voltar ao painel">
          <img src={logo} alt="CRI Soluções Imobiliárias" className="marca-logo" width={60} height={29} />
          <span className="marca-sub">Soluções Imobiliárias · Captação de leads</span>
        </button>
        <div className="topo-acoes">
          <span className={`modo${escritaLiberada ? ' liberado' : ''}`}>
            {escritaLiberada ? 'Escrita liberada' : 'Somente leitura'}
          </span>
          {escritaLiberada ? (
            <button type="button" className="btn" onClick={onTravar}>Travar</button>
          ) : (
            <button type="button" className="btn" onClick={onDestravar}>Destravar escrita</button>
          )}
        </div>
      </div>
    </header>
  );
}
