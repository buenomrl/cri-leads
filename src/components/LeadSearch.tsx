interface Props {
  termo: string;
  mostrando: number;
  total: number;
  onMudar: (termo: string) => void;
}

export function LeadSearch({ termo, mostrando, total, onMudar }: Props) {
  return (
    <div className="busca">
      <label className="busca-campo">
        <span className="sr-only">Buscar leads</span>
        <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          id="busca-leads"
          type="search"
          value={termo}
          placeholder="Buscar por nome, imóvel, origem…"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onMudar(e.target.value)}
        />
        {termo && (
          <button type="button" className="busca-limpar" onClick={() => onMudar('')} aria-label="Limpar busca">
            ×
          </button>
        )}
      </label>
      <span className="fraco num busca-contagem" aria-live="polite">
        Mostrando {mostrando} de {total}
      </span>
    </div>
  );
}
