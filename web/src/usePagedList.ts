import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, type Page } from './api.ts';

type State = {
  items: number[];
  nextCursor: number | null;
  loading: boolean;
  loaded: boolean;
  error: string | null;
};

const empty: State = { items: [], nextCursor: null, loading: false, loaded: false, error: null };

export function usePagedList(fetchPage: (q: string, cursor: number | null) => Promise<Page>, q: string) {
  const [state, setState] = useState<State>(empty);
  const stateRef = useRef(state);
  stateRef.current = state;
  // чтобы ответ старого запроса не перетёр список после reload. Ловил такое при быстром вводе в фильтр
  const generation = useRef(0);

  const load = useCallback(
    async (cursor: number | null) => {
      const gen = generation.current;
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const page = await fetchPage(q, cursor);
        if (gen !== generation.current) return;
        setState((s) => ({
          items: cursor === null ? page.items : s.items.concat(page.items),
          nextCursor: page.nextCursor,
          loading: false,
          loaded: true,
          error: null,
        }));
      } catch (err) {
        if (gen !== generation.current) return;
        if (err instanceof ApiError && err.status === 410) {
          generation.current++;
          setState({ ...empty, loading: true });
          void load(null);
          return;
        }
        setState((s) => ({ ...s, loading: false, error: err instanceof Error ? err.message : String(err) }));
      }
    },
    [fetchPage, q],
  );

  const reload = useCallback(() => {
    generation.current++;
    setState(empty);
    void load(null);
  }, [load]);

  useEffect(() => {
    reload();
    return () => {
      generation.current++;
    };
  }, [reload]);

  const loadMore = useCallback(() => {
    const s = stateRef.current;
    if (s.loading || s.error) return;
    if (s.loaded && s.nextCursor === null) return;
    void load(s.loaded ? s.nextCursor : null);
  }, [load]);

  const mutate = useCallback((fn: (items: number[]) => number[]) => {
    setState((s) => ({ ...s, items: fn(s.items) }));
  }, []);

  return { ...state, loadMore, reload, mutate };
}

export type PagedList = ReturnType<typeof usePagedList>;
