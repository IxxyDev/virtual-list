export const BASE_COUNT = 1_000_000;

export type ItemId = number;

export function parseId(raw: unknown): ItemId | null {
  const n = typeof raw === 'string' && /^\s*\d+\s*$/.test(raw) ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n <= 0) return null;
  return n;
}

export function isBaseId(id: ItemId): boolean {
  return id >= 1 && id <= BASE_COUNT;
}
