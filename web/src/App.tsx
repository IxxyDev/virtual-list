import { useCallback, useState } from 'react';
import { api, ApiError } from './api.ts';
import { AvailablePanel } from './AvailablePanel.tsx';
import { SelectedPanel } from './SelectedPanel.tsx';
import { usePagedList } from './usePagedList.ts';
import { track, usePending } from './pending.ts';
import { useDebounced, useHealth } from './hooks.ts';
import { insertSorted, matchesQuery, moveBefore, without } from './lists.ts';

export function App() {
  const [leftQuery, setLeftQuery] = useState('');
  const [rightQuery, setRightQuery] = useState('');
  const leftQ = useDebounced(leftQuery.trim(), 300);
  const rightQ = useDebounced(rightQuery.trim(), 300);
  const left = usePagedList(api.items, leftQ);
  const right = usePagedList(api.selected, rightQ);
  const pending = usePending();
  const health = useHealth(2000);
  const [notice, setNotice] = useState<string | null>(null);

  const isPending = useCallback((key: string) => pending.some((op) => op.key === key), [pending]);

  const fail = (err: unknown) => {
    setNotice(err instanceof Error ? err.message : String(err));
    if (err instanceof ApiError && (err.status === 404 || err.status === 409 || err.status === 410)) {
      left.reload();
      right.reload();
    }
  };

  const select = (id: number) => {
    track(`select:${id}`, `выбор #${id}`, () => api.select(id))
      .then(() => {
        left.mutate((items) => without(items, id));
        if (right.loaded && right.nextCursor === null && matchesQuery(id, rightQ)) {
          right.mutate((items) => [...items, id]);
        }
      })
      .catch(fail);
  };

  const deselect = (id: number) => {
    track(`deselect:${id}`, `снятие #${id}`, () => api.deselect(id))
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
    track(`move:${id}`, `перенос #${id}`, () => api.move(id, beforeId))
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
    track(`add:${id}`, `добавление #${id}`, () => api.addItem(id))
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
      <header className="status">
        <div className="pending-ops">
          {pending.length === 0 && <span className="muted">нет ожидающих операций</span>}
          {pending.map((op) => (
            <span key={op.key} className="chip">
              {op.label}
            </span>
          ))}
        </div>
      </header>
      {notice && (
        <div className="notice" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
      <main className="panels">
        <AvailablePanel
          list={left}
          query={leftQuery}
          onQuery={setLeftQuery}
          onSelect={select}
          onAdd={add}
          isPending={isPending}
        />
        <SelectedPanel
          list={right}
          total={health?.selected ?? null}
          query={rightQuery}
          onQuery={setRightQuery}
          onDeselect={deselect}
          onMove={move}
          isPending={isPending}
        />
      </main>
    </div>
  );
}
