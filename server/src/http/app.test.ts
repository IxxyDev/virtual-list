import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from './app.ts';
import { createService, type Service, type ServiceConfig } from '../app/service.ts';
import { BASE_COUNT } from '../domain/ids.ts';

const config: ServiceConfig = { addIntervalMs: 20, rwIntervalMs: 5, maxPending: 1000, pageSize: 20 };

let service: Service;
let server: Server;
let base: string;

function start() {
  service = createService(config);
  server = createApp(service).listen(0);
  const address = server.address();
  if (typeof address !== 'object' || address === null) throw new Error('no address');
  base = `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  service.close();
  await new Promise((resolve) => server.close(resolve));
});

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, headers: res.headers, body: (await res.json()) as any };
}

test('pages, filters and adds items', async () => {
  start();

  const first = await call('GET', '/api/items');
  const second = await call('GET', `/api/items?cursor=${first.body.nextCursor}`);
  const filtered = await call('GET', '/api/items?q=99');
  const created = await call('POST', '/api/items', { id: BASE_COUNT + 1 });
  const again = await call('POST', '/api/items', { id: BASE_COUNT + 1 });
  const garbage = await call('POST', '/api/items', { id: 'abc' });

  assert.deepEqual(first.body.items.slice(0, 3), [1, 2, 3]);
  assert.deepEqual(second.body.items.slice(0, 2), [21, 22]);
  assert.deepEqual(filtered.body.items.slice(0, 3), [99, 199, 299]);
  assert.equal(created.status, 201);
  assert.equal(again.status, 409);
  assert.equal(garbage.status, 400);
});

test('keeps selection order and maps results to statuses', async () => {
  start();

  for (const id of [3, 1, 2]) await call('POST', '/api/selected', { id });
  const moved = await call('PATCH', '/api/selected/2', { beforeId: 3 });
  const unknown = await call('POST', '/api/selected', { id: BASE_COUNT + 100 });
  const badAnchor = await call('PATCH', '/api/selected/1', { beforeId: 9 });
  const deselected = await call('DELETE', '/api/selected/1');
  const goneCursor = await call('GET', '/api/selected?cursor=1');
  const left = await call('GET', '/api/items');
  const right = await call('GET', '/api/selected');

  assert.equal(moved.status, 200);
  assert.equal(unknown.status, 404);
  assert.equal(badAnchor.status, 409);
  assert.equal(deselected.status, 200);
  assert.equal(goneCursor.status, 410);
  assert.deepEqual(right.body.items, [2, 3]);
  assert.deepEqual(left.body.items.slice(0, 3), [1, 4, 5]);
});
