import { useState } from 'react';
import { api, ApiError } from './api.ts';
import { AvailablePanel } from './AvailablePanel.tsx';
import { SelectedPanel } from './SelectedPanel.tsx';
import { usePagedList } from './usePagedList.ts';
import { useDebounced } from './hooks.ts';
import { insertSorted, matchesQuery, moveBefore, without } from './lists.ts';

export function App() {
  const [leftQuery, setLeftQuery] = useState('');
  const [rightQuery, setRightQuery] = useState('');
  const leftQ = useDebounced(leftQuery.trim(), 300);
  const rightQ = useDebounced(rightQuery.trim(), 300);
  const left = usePagedList(api.items, leftQ);
  const right = usePagedList(api.selected, rightQ);
  const [notice, setNotice] = useState<string | null>(null);

  const fail = (err: unknown) => {
    setNotice(err instanceof Error ? err.message : String(err));
    if (err instanceof ApiError && (err.status === 404 || err.status === 409 || err.status === 410)) {
      left.reload();
      right.reload();
    }
  };

  const select = (id: number) => {
    api
      .select(id)
      .then(() => {
        left.mutate((items) => without(items, id));
        if (right.loaded && right.nextCursor === null && matchesQuery(id, rightQ)) {
          right.mutate((items) => [...items, id]);
        }
      })
      .catch(fail);
  };

  const deselect = (id: number) => {
    api
      .deselect(id)
      .then(() => {
        right.mutate((items) => without(items, id));
        const lastLoaded = left.items.at(-1);
        const inLoadedRange = left.nextCursor === null || (lastLoaded !== undefined && id < lastLoaded);
        if (left.loaded && inLoadedRange && matchesQuery(id, leftQ)) {
          left.mutate((items) => insertSorted(items, id));
        }
      })
      .catch(fail);
  };

  const move = (id: number, beforeId: number | null) => {
    api
      .move(id, beforeId)
      .then(() => {
        if (beforeId === null && right.nextCursor !== null) {
          right.mutate((items) => without(items, id));
          return;
        }
        right.mutate((items) => moveBefore(items, id, beforeId));
      })
      .catch(fail);
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
        <SelectedPanel
          list={right}
          query={rightQuery}
          onQuery={setRightQuery}
          onDeselect={deselect}
          onMove={move}
        />
      </main>
    </div>
  );
}
