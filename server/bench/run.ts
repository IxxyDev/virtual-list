import { performance } from 'node:perf_hooks';
import { Catalog } from '../src/domain/catalog.ts';
import { Selection } from '../src/domain/selection.ts';
import { BASE_COUNT } from '../src/domain/ids.ts';
import { BatchQueue } from '../src/queue/batch-queue.ts';

const gc = globalThis.gc ?? (() => {});
const none = () => false;
const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

type Row = { name: string; ms: string; note: string };
const rows: Row[] = [];

function timed(name: string, fn: () => unknown, note = ''): number {
  gc();
  const start = performance.now();
  fn();
  const ms = performance.now() - start;
  rows.push({ name, ms: ms.toFixed(2), note });
  return ms;
}

function median(name: string, fn: () => unknown, runs: number, note = ''): number {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    gc();
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  const ms = samples[Math.floor(runs / 2)]!;
  rows.push({ name, ms: ms.toFixed(2), note: `${note} медиана из ${runs}`.trim() });
  return ms;
}

function heapDelta(name: string, fn: () => unknown): void {
  gc();
  const before = process.memoryUsage().heapUsed;
  fn();
  gc();
  const after = process.memoryUsage().heapUsed;
  rows.push({ name, ms: '', note: `heap +${mb(after - before)} MB` });
}

const catalog = new Catalog();

median('левый список, первая страница без фильтра', () => catalog.list('', null, 20, none), 20);
median('фильтр "5", первая страница', () => catalog.list('5', null, 20, none), 20);
median('фильтр "999999", полный скан 1M (худший случай)', () => catalog.list('999999', null, 20, none), 10);
median('фильтр "77", страница с курсором 900000', () => catalog.list('77', 900_000, 20, none), 20);

const fullSelection = new Selection();
heapDelta('память: Selection на 1M элементов', () => {
  for (let id = 1; id <= BASE_COUNT; id++) fullSelection.select(id);
});
median('левый список, когда выбраны все 1M (скан с исключением)', () => catalog.list('', null, 20, (id) => fullSelection.has(id)), 10);

const selection = new Selection();
timed('select 100k элементов подряд', () => {
  for (let id = 1; id <= 100_000; id++) selection.select(id);
});
timed('select ещё 900k (итого 1M)', () => {
  for (let id = 100_001; id <= BASE_COUNT; id++) selection.select(id);
});
median('moveBefore: последний в начало при 1M выбранных', () => selection.moveBefore(BASE_COUNT, 1), 10);
median('moveBefore: первый в конец при 1M выбранных', () => selection.moveBefore(1, null), 10);
median('deselect из середины при 1M выбранных', () => {
  selection.deselect(500_000);
  selection.select(500_000);
}, 10, 'deselect + select обратно');
median('правый список, страница с курсором в конце 1M', () => selection.list('', BASE_COUNT - 40, 20), 10);
median('правый список, фильтр "999999" по 1M выбранных', () => selection.list('999999', null, 20), 10);

const customCatalog = new Catalog();
heapDelta('память: Catalog с 100k добавленных id', () => {
  for (let i = 1; i <= 100_000; i++) customCatalog.add(BASE_COUNT + i);
});
median('левый список с курсором внутри 100k добавленных', () => customCatalog.list('', BASE_COUNT + 50_000, 20, none), 20);

const keepAlive = setInterval(() => {}, 1000);
await queueBench(20_000);
await queueBench(100_000);
clearInterval(keepAlive);

const mem = process.memoryUsage();
rows.push({ name: 'процесс после всех замеров', ms: '', note: `rss ${mb(mem.rss)} MB, heapUsed ${mb(mem.heapUsed)} MB` });

console.log(`node ${process.version}, ${process.arch}, ${new Date().toLocaleDateString('sv-SE')}\n`);
console.log('| замер | мс | примечание |');
console.log('|---|---:|---|');
for (const r of rows) console.log(`| ${r.name} | ${r.ms} | ${r.note} |`);

async function queueBench(ops: number): Promise<void> {
  const s = new Selection();
  const queue = new BatchQueue({ intervalMs: 1, maxPending: ops });
  let tickStart = 0;
  gc();
  const enqueueStart = performance.now();
  const all = Promise.all(
    Array.from({ length: ops }, (_, i) =>
      queue.enqueue(`select:${i}`, () => {
        if (i === 0) tickStart = performance.now();
        return s.select(i + 1);
      }),
    ),
  );
  const enqueueMs = performance.now() - enqueueStart;
  await all;
  const tickMs = performance.now() - tickStart;
  rows.push({ name: `очередь: enqueue ${ops} операций select`, ms: enqueueMs.toFixed(2), note: 'время приёма, по одному промису на операцию' });
  rows.push({ name: `очередь: тик на ${ops} операций select`, ms: tickMs.toFixed(2), note: 'столько event loop занят синхронно' });
}
