import type { ReactNode } from 'react';

type Props = {
  title: string;
  subtitle?: string;
  query: string;
  onQuery: (q: string) => void;
  toolbar?: ReactNode;
  children: ReactNode;
};

export function Panel({ title, subtitle, query, onQuery, toolbar, children }: Props) {
  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <div className="muted">{subtitle}</div>}
        </div>
        <input
          className="filter"
          inputMode="numeric"
          placeholder="Фильтр по ID"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
        />
      </header>
      {toolbar && <div className="toolbar">{toolbar}</div>}
      {children}
    </section>
  );
}
