import type { ServiceConfig } from './app/service.ts';

export type Config = ServiceConfig & { port: number };

export function readConfig(env: NodeJS.ProcessEnv): Config {
  return {
    port: int(env.PORT, 3000),
    addIntervalMs: int(env.ADD_INTERVAL_MS, 10_000),
    rwIntervalMs: int(env.RW_INTERVAL_MS, 1_000),
    maxPending: int(env.MAX_PENDING, 100_000),
    pageSize: 20,
  };
}

function int(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw !== undefined && Number.isInteger(n) && n > 0 ? n : fallback;
}
