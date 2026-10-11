import { useState, type DragEvent } from 'react';
import { Panel } from './Panel.tsx';
import { VirtualList } from './VirtualList.tsx';
import { ListFooter } from './AvailablePanel.tsx';
import type { PagedList } from './usePagedList.ts';

type Props = {
  list: PagedList;
  query: string;
  onQuery: (q: string) => void;
  onDeselect: (id: number) => void;
  onMove: (id: number, beforeId: number | null) => void;
};

export function SelectedPanel({ list, query, onQuery, onDeselect, onMove }: Props) {
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null | 'end'>(null);

  const dragged = (e: DragEvent) => Number(e.dataTransfer.getData('text/plain'));

  const dropOn = (beforeId: number | null) => (e: DragEvent) => {
    e.preventDefault();
    const id = dragged(e);
    setDragId(null);
    setOverId(null);
    if (Number.isSafeInteger(id) && id !== beforeId) onMove(id, beforeId);
  };

  const allow = (target: number | 'end') => (e: DragEvent) => {
    if (dragId === null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (overId !== target) setOverId(target);
  };

  return (
    <Panel title="Выбранные" subtitle={`загружено ${list.items.length}`} query={query} onQuery={onQuery}>
      <VirtualList
        count={list.items.length}
        rowHeight={40}
        onEndReached={list.loadMore}
        footer={
          <>
            {list.items.length > 0 && (
              <div
                className={overId === 'end' ? 'drop-end over' : 'drop-end'}
                onDragOver={allow('end')}
                onDragLeave={() => setOverId(null)}
                onDrop={dropOn(null)}
              >
                В конец списка
              </div>
            )}
            <ListFooter list={list} />
          </>
        }
        renderRow={(index) => {
          const id = list.items[index]!;
          const classes = ['row', 'draggable'];
          if (overId === id && dragId !== id) classes.push('over');
          if (dragId === id) classes.push('dragging');
          return (
            <div
              className={classes.join(' ')}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(id));
                e.dataTransfer.effectAllowed = 'move';
                setDragId(id);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              onDragOver={allow(id)}
              onDragLeave={() => setOverId(null)}
              onDrop={dropOn(id)}
            >
              <span className="grip" aria-hidden>
                ⋮⋮
              </span>
              <span className="id">#{id}</span>
              <button className="ghost" onClick={() => onDeselect(id)} title="Убрать из выбранных">
                ←
              </button>
            </div>
          );
        }}
      />
    </Panel>
  );
}
