import { useSyncExternalStore } from 'react';

export type PendingOp = {
  key: string;
  label: string;
};

let ops: PendingOp[] = [];
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function track<T>(key: string, label: string, work: () => Promise<T>): Promise<T> {
  ops = [...ops, { key, label }];
  emit();
  return work().finally(() => {
    ops = ops.filter((op) => op.key !== key);
    emit();
  });
}

export function usePending(): PendingOp[] {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => ops,
  );
}
