export type Lane = 'write' | 'read';

export type BatchQueueOptions = {
  intervalMs: number;
  maxPending: number;
};

export class QueueOverflowError extends Error {
  constructor() {
    super('queue is full');
    this.name = 'QueueOverflowError';
  }
}

type Entry = {
  run: () => unknown;
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

export class BatchQueue {
  private readonly lanes: Record<Lane, Map<string, Entry>> = { write: new Map(), read: new Map() };
  private readonly options: BatchQueueOptions;
  private timer: NodeJS.Timeout | null = null;

  constructor(options: BatchQueueOptions) {
    this.options = options;
  }

  enqueue<R>(key: string, run: () => R, lane: Lane = 'write'): Promise<R> {
    const existing = this.lanes[lane].get(key);
    if (existing) return existing.promise as Promise<R>;
    if (this.pending >= this.options.maxPending) return Promise.reject(new QueueOverflowError());

    const { promise, resolve, reject } = Promise.withResolvers<unknown>();
    this.lanes[lane].set(key, { run, promise, resolve, reject });
    this.schedule();
    return promise as Promise<R>;
  }

  get pending(): number {
    return this.lanes.write.size + this.lanes.read.size;
  }

  close(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    for (const lane of Object.values(this.lanes)) {
      for (const entry of lane.values()) entry.reject(new Error('queue closed'));
      lane.clear();
    }
  }

  private schedule(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => this.tick(), this.options.intervalMs);
    this.timer.unref();
  }

  private tick(): void {
    this.timer = null;
    // записи вперёд, иначе list в той же пачке отдаст старое
    for (const lane of [this.lanes.write, this.lanes.read]) {
      for (const [key, entry] of lane) {
        lane.delete(key);
        try {
          entry.resolve(entry.run());
        } catch (err) {
          entry.reject(err);
        }
      }
    }
  }
}
