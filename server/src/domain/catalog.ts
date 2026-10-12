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
    this.custom.splice(lowerBound(this.custom, id), 0, id);
    return true;
  }

  list(q: Query, cursor: ItemId | null, limit: number, exclude: (id: ItemId) => boolean): Page {
    const items: ItemId[] = [];
    if (q === null) return page(items, limit);

    const from = cursor === null ? 1 : cursor + 1;
    for (let id = from; id <= BASE_COUNT && items.length < limit; id++) {
      if (matches(id, q) && !exclude(id)) items.push(id);
    }
    for (let i = lowerBound(this.custom, from); i < this.custom.length && items.length < limit; i++) {
      const id = this.custom[i]!;
      if (matches(id, q) && !exclude(id)) items.push(id);
    }
    return page(items, limit);
  }
}

function lowerBound(sorted: ItemId[], value: ItemId): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid]! < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
