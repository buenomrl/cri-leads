interface Props {
  escritaLiberada: boolean;
  onInicio: () => void;
  onDestravar: () => void;
  onTravar: () => void;
}

export function TopBar({ escritaLiberada, onInicio, onDestravar, onTravar }: Props) {
  return (
    <header className="topo">
      <button type="button" className="marca" onClick={onInicio} aria-label="Voltar ao painel">
        <span className="marca-cri">CRI</span>
        <span className="marca-sub">Soluções Imobiliárias</span>
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
    </header>
  );
}
