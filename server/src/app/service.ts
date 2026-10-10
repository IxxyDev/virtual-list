import { Catalog } from '../domain/catalog.ts';
import { Selection, type MoveResult } from '../domain/selection.ts';
import type { ItemId, Query } from '../domain/ids.ts';
import type { Page } from '../domain/page.ts';
import { BatchQueue } from '../queue/batch-queue.ts';

export type ServiceConfig = {
  addIntervalMs: number;
  rwIntervalMs: number;
  maxPending: number;
  pageSize: number;
};

export type AddResult = 'created' | 'exists';
export type SelectResult = 'selected' | 'already_selected' | 'not_found';
export type DeselectResult = 'deselected' | 'not_selected';

export function createService(config: ServiceConfig) {
  const catalog = new Catalog();
  const selection = new Selection();
  // add по ТЗ раз в 10 с, остальное раз в секунду, поэтому две очереди
  const adds = new BatchQueue({ intervalMs: config.addIntervalMs, maxPending: config.maxPending });
  const changes = new BatchQueue({ intervalMs: config.rwIntervalMs, maxPending: config.maxPending });

  return {
    addItem(id: ItemId): Promise<AddResult> {
      return adds.enqueue(`add:${id}`, () => (catalog.add(id) ? 'created' : 'exists'));
    },

    select(id: ItemId): Promise<SelectResult> {
      return changes.enqueue(`select:${id}`, () => {
        if (!catalog.has(id)) return 'not_found';
        return selection.select(id) ? 'selected' : 'already_selected';
      });
    },

    deselect(id: ItemId): Promise<DeselectResult> {
      return changes.enqueue(`deselect:${id}`, () => (selection.deselect(id) ? 'deselected' : 'not_selected'));
    },

    move(id: ItemId, beforeId: ItemId | null): Promise<MoveResult> {
      return changes.enqueue(`move:${id}:${beforeId ?? 'end'}`, () => selection.moveBefore(id, beforeId));
    },

    listAvailable(q: Query, cursor: ItemId | null): Promise<Page> {
      return changes.enqueue(
        `available:${q}:${cursor}`,
        () => catalog.list(q, cursor, config.pageSize, (id) => selection.has(id)),
        'read',
      );
    },

    listSelected(q: Query, cursor: ItemId | null): Promise<Page | null> {
      return changes.enqueue(`selected:${q}:${cursor}`, () => selection.list(q, cursor, config.pageSize), 'read');
    },

    stats() {
      return { selected: selection.size, custom: catalog.customCount, pending: adds.pending + changes.pending };
    },

    close() {
      adds.close();
      changes.close();
    },
  };
}

export type Service = ReturnType<typeof createService>;
