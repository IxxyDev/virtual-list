import { useState } from 'react';
import { api, ApiError } from './api.ts';
import { AvailablePanel } from './AvailablePanel.tsx';
import { usePagedList } from './usePagedList.ts';
import { useDebounced } from './hooks.ts';
import { insertSorted, matchesQuery, without } from './lists.ts';

export function App() {
  const [leftQuery, setLeftQuery] = useState('');
  const leftQ = useDebounced(leftQuery.trim(), 300);
  const left = usePagedList(api.items, leftQ);
  const [notice, setNotice] = useState<string | null>(null);

  const select = (id: number) => {
    api
      .select(id)
      .then(() => left.mutate((items) => without(items, id)))
      .catch((err: unknown) => setNotice(err instanceof Error ? err.message : String(err)));
  };

  const add = (id: number) =>
    api
      .addItem(id)
      .then(() => {
        setNotice(`#${id} добавлен в конец списка`);
        if (left.loaded && left.nextCursor === null && matchesQuery(id, leftQ)) {
          left.mutate((items) => insertSorted(items, id));
        }
      })
      .catch((err: unknown) => {
        setNotice(err instanceof ApiError && err.status === 409 ? `#${id} уже существует` : String(err));
      });

  return (
    <div className="app">
      {notice && (
        <div className="notice" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
      <main className="panels">
        <AvailablePanel list={left} query={leftQuery} onQuery={setLeftQuery} onSelect={select} onAdd={add} />
      </main>
    </div>
  );
}
