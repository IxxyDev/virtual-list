import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Catalog } from './catalog.ts';
import { BASE_COUNT } from './ids.ts';

const none = () => false;

test('should reject duplicates and page through base and custom ids', () => {
  const catalog = new Catalog();
  const excluded = new Set([77, 277]);

  const added = [catalog.add(BASE_COUNT + 30), catalog.add(BASE_COUNT + 30), catalog.add(42), catalog.add(BASE_COUNT + 10)];
  const first = catalog.list('', null, 3, none);
  const second = catalog.list('', first.nextCursor, 3, none);
  const filtered = catalog.list('77', null, 3, (id) => excluded.has(id));
  const tail = catalog.list('', BASE_COUNT - 1, 20, none);

  assert.deepEqual(added, [true, false, false, true]);
  assert.deepEqual(first, { items: [1, 2, 3], nextCursor: 3 });
  assert.deepEqual(second.items, [4, 5, 6]);
  assert.deepEqual(filtered.items, [177, 377, 477]);
  assert.deepEqual(tail, { items: [BASE_COUNT, BASE_COUNT + 10, BASE_COUNT + 30], nextCursor: null });
});
