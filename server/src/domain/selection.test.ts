import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Selection } from './selection.ts';

function selected(...ids: number[]): Selection {
  const s = new Selection();
  for (const id of ids) s.select(id);
  return s;
}

test('should keep order and return null for a stale cursor', () => {
  const s = selected(30, 10, 20);

  const again = s.select(10);
  const first = s.list('', null, 2)!;
  const second = s.list('', first.nextCursor, 2)!;
  s.deselect(10);
  const gone = s.list('', 10, 2);

  assert.equal(again, false);
  assert.deepEqual(first, { items: [30, 10], nextCursor: 10 });
  assert.deepEqual(second, { items: [20], nextCursor: null });
  assert.equal(gone, null);
});

test('should move before anchor, to the end, and fail on missing anchor', () => {
  const s = selected(100, 1, 200, 2, 300, 3);

  const underFilter = s.moveBefore(300, 100);
  const toEnd = s.moveBefore(1, null);
  const missingAnchor = s.moveBefore(2, 999);

  assert.deepEqual([underFilter, toEnd, missingAnchor], ['moved', 'moved', 'anchor_not_found']);
  assert.deepEqual(s.toArray(), [300, 100, 200, 2, 3, 1]);
  assert.deepEqual(s.list('00', null, 20)!.items, [300, 100, 200]);
});
