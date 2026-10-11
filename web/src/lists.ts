export function matchesQuery(id: number, q: string): boolean {
  return q === '' || String(id).includes(q);
}

export function without(items: number[], id: number): number[] {
  return items.filter((x) => x !== id);
}

export function insertSorted(items: number[], id: number): number[] {
  if (items.includes(id)) return items;
  const at = items.findIndex((x) => x > id);
  return at === -1 ? [...items, id] : [...items.slice(0, at), id, ...items.slice(at)];
}
