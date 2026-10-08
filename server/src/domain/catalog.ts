import { BASE_COUNT, isBaseId, matches, type ItemId, type Query } from './ids.ts';
import { page, type Page } from './page.ts';

export class Catalog {
  private custom: ItemId[] = [];
  private customSet = new Set<ItemId>();

  has(id: ItemId): boolean {
    return isBaseId(id) || this.customSet.has(id);
  }

  get customCount(): number {
    return this.custom.length;
  }

  add(id: ItemId): boolean {
    if (this.has(id)) return false;
    this.customSet.add(id);
    this.custom.push(id);
    this.custom.sort((a, b) => a - b);
    return true;
  }

  list(q: Query, cursor: ItemId | null, limit: number, exclude: (id: ItemId) => boolean): Page {
    const items: ItemId[] = [];
    if (q === null) return page(items, limit);

    const from = cursor === null ? 1 : cursor + 1;
    for (let id = from; id <= BASE_COUNT && items.length < limit; id++) {
      if (matches(id, q) && !exclude(id)) items.push(id);
    }
    for (const id of this.custom) {
      if (items.length >= limit) break;
      if (id >= from && matches(id, q) && !exclude(id)) items.push(id);
    }
    return page(items, limit);
  }
}
