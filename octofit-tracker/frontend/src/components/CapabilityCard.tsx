import type { ReactNode } from 'react';

type Props = {
  title: string;
  description: string;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  items?: ReactNode[];
};

export function CapabilityCard({ title, description, loading = false, error = null, emptyMessage = 'No items available.', items = [] }: Props) {
  return (
    <section className="card h-100">
      <div className="card-body">
        <h2 className="h4">{title}</h2>
        <p>{description}</p>
        {loading ? <p role="status">Loading...</p> : null}
        {!loading && error ? <div role="alert">Unable to load {title.toLowerCase()}.</div> : null}
        {!loading && !error && items.length === 0 ? <p>{emptyMessage}</p> : null}
        {!loading && !error && items.length > 0 ? <ul className="mb-0">{items}</ul> : null}
      </div>
    </section>
  );
}
