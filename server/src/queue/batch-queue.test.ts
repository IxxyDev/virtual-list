import { afterEach, beforeEach, mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { BatchQueue, QueueOverflowError } from './batch-queue.ts';

const options = { intervalMs: 1000, maxPending: 1000 };

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => mock.timers.reset());

test('should run writes in order, dedupe keys and run reads last', async () => {
  const queue = new BatchQueue(options);
  const log: string[] = [];

  const read = queue.enqueue('list', () => log.push('list'), 'read');
  const writes = Promise.all(['a', 'b', 'a', 'c'].map((key) => queue.enqueue(key, () => log.push(key))));
  mock.timers.tick(999);
  const beforeTick = log.slice();
  mock.timers.tick(1);
  const results = await writes;

  assert.deepEqual(beforeTick, []);
  assert.deepEqual(log, ['a', 'b', 'c', 'list']);
  assert.deepEqual(results, [1, 2, 1, 3]);
  assert.equal(await read, 4);
});

test('should reject on overflow and isolate a failing operation', async () => {
  const queue = new BatchQueue({ ...options, maxPending: 2 });
  const log: string[] = [];

  const bad = queue.enqueue('bad', () => {
    throw new Error('boom');
  });
  const good = queue.enqueue('good', () => log.push('good'));
  const overflow = queue.enqueue('late', () => log.push('late'));
  mock.timers.tick(1000);

  await assert.rejects(overflow, QueueOverflowError);
  await assert.rejects(bad, /boom/);
  assert.equal(await good, 1);
  assert.deepEqual(log, ['good']);
  assert.equal(queue.pending, 0);
});
