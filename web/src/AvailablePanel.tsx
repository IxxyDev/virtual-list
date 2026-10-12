import { useState, type FormEvent } from 'react';
import { Panel } from './Panel.tsx';
import { VirtualList } from './VirtualList.tsx';
import type { PagedList } from './usePagedList.ts';

type Props = {
  list: PagedList;
  query: string;
  onQuery: (q: string) => void;
  onSelect: (id: number) => void;
  onAdd: (id: number) => Promise<void>;
  isPending: (key: string) => boolean;
};

export function AvailablePanel({ list, query, onQuery, onSelect, onAdd, isPending }: Props) {
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const id = Number(draft.trim());
    if (!Number.isSafeInteger(id) || id <= 0) return;
    setAdding(true);
    try {
      await onAdd(id);
      setDraft('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Panel
      title="Все элементы"
      subtitle={list.loaded ? `загружено ${list.items.length}` : 'загрузка'}
      query={query}
      onQuery={onQuery}
      toolbar={
        <form className="add-form" onSubmit={submit}>
          <input
            inputMode="numeric"
            placeholder="Новый ID"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={adding}
          />
          <button type="submit" disabled={adding || draft.trim() === ''}>
            {adding ? 'В очереди...' : 'Добавить'}
          </button>
        </form>
      }
    >
      <VirtualList
        count={list.items.length}
        rowHeight={40}
        onEndReached={list.loadMore}
        footer={<ListFooter list={list} />}
        renderRow={(index) => {
          const id = list.items[index]!;
          const pending = isPending(`select:${id}`);
          return (
            <div className={pending ? 'row pending' : 'row'}>
              <span className="id">#{id}</span>
              <button className="ghost" onClick={() => onSelect(id)} disabled={pending} title="Выбрать">
                {pending ? '...' : '→'}
              </button>
            </div>
          );
        }}
      />
    </Panel>
  );
}

export function ListFooter({ list }: { list: PagedList }) {
  if (list.error) {
    return (
      <div className="list-footer error">
        {list.error}{' '}
        <button className="link" onClick={list.reload}>
          повторить
        </button>
      </div>
    );
  }
  if (list.loading) return <div className="list-footer muted">Загрузка...</div>;
  if (list.loaded && list.items.length === 0) return <div className="list-footer muted">Пусто</div>;
  return null;
}
