import type { ItemId } from './ids.ts';

export type Page = {
  items: ItemId[];
  nextCursor: ItemId | null;
};

export function page(items: ItemId[], limit: number): Page {
  const last = items[items.length - 1];
  return { items, nextCursor: items.length === limit && last !== undefined ? last : null };
}
