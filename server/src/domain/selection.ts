import { matches, type ItemId, type Query } from './ids.ts';
import { page, type Page } from './page.ts';

export type MoveResult = 'moved' | 'not_selected' | 'anchor_not_found';

export class Selection {
  private order: ItemId[] = [];
  private readonly set = new Set<ItemId>();

  has(id: ItemId): boolean {
    return this.set.has(id);
  }

  get size(): number {
    return this.order.length;
  }

  select(id: ItemId): boolean {
    if (this.set.has(id)) return false;
    this.set.add(id);
    this.order.push(id);
    return true;
  }

  deselect(id: ItemId): boolean {
    if (!this.set.delete(id)) return false;
    this.order.splice(this.order.indexOf(id), 1);
    return true;
  }

  moveBefore(id: ItemId, beforeId: ItemId | null): MoveResult {
    if (!this.set.has(id)) return 'not_selected';
    if (beforeId !== null && !this.set.has(beforeId)) return 'anchor_not_found';
    if (beforeId === id) return 'moved';
    this.order.splice(this.order.indexOf(id), 1);
    const to = beforeId === null ? this.order.length : this.order.indexOf(beforeId);
    this.order.splice(to, 0, id);
    return 'moved';
  }

  list(q: Query, cursor: ItemId | null, limit: number): Page | null {
    const items: ItemId[] = [];
    if (q === null) return page(items, limit);
    let from = 0;
    if (cursor !== null) {
      const at = this.order.indexOf(cursor);
      if (at === -1) return null;
      from = at + 1;
    }
    for (let i = from; i < this.order.length && items.length < limit; i++) {
      const id = this.order[i]!;
      if (matches(id, q)) items.push(id);
    }
    return page(items, limit);
  }

  toArray(): ItemId[] {
    return this.order.slice();
  }
}
