import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { createService, type Service } from './service.ts';
import { BASE_COUNT } from '../domain/ids.ts';

const fast = { addIntervalMs: 30, rwIntervalMs: 10, maxPending: 10_000, pageSize: 20 };

let service: Service;
afterEach(() => service.close());

test('should apply changes in arrival order and expose them to reads', async () => {
  service = createService(fast);

  const [left, ...results] = await Promise.all([
    service.listAvailable('', null),
    service.select(30),
    service.select(10),
    service.select(7),
    service.deselect(7),
    service.move(10, 30),
    service.move(30, 7),
  ]);
  const right = await service.listSelected('', null);

  assert.deepEqual(results, ['selected', 'selected', 'selected', 'deselected', 'moved', 'anchor_not_found']);
  assert.deepEqual(right?.items, [10, 30]);
  assert.deepEqual(left.items.slice(0, 3), [1, 2, 3]);
  assert.equal(left.items.includes(10), false);
});

test('should dedupe concurrent adds and hide the item until the batch', async () => {
  service = createService(fast);
  const id = BASE_COUNT + 1;

  const adds = Promise.all([service.addItem(id), service.addItem(id)]);
  const tooEarly = await service.select(id);
  const both = await adds;
  const retry = await service.addItem(id);
  const afterAdd = await service.select(id);

  assert.deepEqual(both, ['created', 'created']);
  assert.deepEqual([tooEarly, retry, afterAdd], ['not_found', 'exists', 'selected']);
  assert.equal(service.stats().custom, 1);
});
