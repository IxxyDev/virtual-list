import express, { type ErrorRequestHandler, type Response } from 'express';
import { normalizeQuery, parseId } from '../domain/ids.ts';
import { QueueOverflowError } from '../queue/batch-queue.ts';
import type { Service } from '../app/service.ts';

const BAD_ID = 'id must be a positive integer';

function badRequest(res: Response, error: string) {
  res.status(400).json({ error });
}

function parseCursor(raw: unknown): number | null | undefined {
  if (raw === undefined || raw === '') return null;
  return parseId(raw) ?? undefined;
}

export function createApp(service: Service) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1kb' }));

  const api = express.Router();

  api.get('/health', (_req, res) => {
    res.json(service.stats());
  });

  api.get('/items', async (req, res) => {
    const cursor = parseCursor(req.query.cursor);
    if (cursor === undefined) return badRequest(res, 'invalid cursor');
    res.json(await service.listAvailable(normalizeQuery(req.query.q), cursor));
  });

  api.post('/items', async (req, res) => {
    const id = parseId(req.body?.id);
    if (id === null) return badRequest(res, BAD_ID);
    const result = await service.addItem(id);
    res.status(result === 'created' ? 201 : 409).json({ id, result });
  });

  api.get('/selected', async (req, res) => {
    const cursor = parseCursor(req.query.cursor);
    if (cursor === undefined) return badRequest(res, 'invalid cursor');
    const page = await service.listSelected(normalizeQuery(req.query.q), cursor);
    if (page === null) {
      res.status(410).json({ error: 'cursor is gone' });
      return;
    }
    res.json(page);
  });

  api.post('/selected', async (req, res) => {
    const id = parseId(req.body?.id);
    if (id === null) return badRequest(res, BAD_ID);
    const result = await service.select(id);
    res.status(result === 'not_found' ? 404 : 200).json({ id, result });
  });

  api.delete('/selected/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return badRequest(res, BAD_ID);
    const result = await service.deselect(id);
    res.json({ id, result });
  });

  api.patch('/selected/:id', async (req, res) => {
    const id = parseId(req.params.id);
    if (id === null) return badRequest(res, BAD_ID);
    const beforeId = req.body?.beforeId === null ? null : parseId(req.body?.beforeId);
    if (beforeId === undefined || (beforeId === null && req.body?.beforeId !== null)) {
      return badRequest(res, 'beforeId must be a positive integer or null');
    }
    const result = await service.move(id, beforeId);
    const status = result === 'moved' ? 200 : result === 'not_selected' ? 404 : 409;
    res.status(status).json({ id, beforeId, result });
  });

  app.use('/api', api);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof QueueOverflowError) {
      res.status(503).set('Retry-After', '1').json({ error: 'queue is full, retry later' });
    } else if (err?.type === 'entity.parse.failed') {
      badRequest(res, 'malformed json');
    } else {
      console.error(err);
      res.status(500).json({ error: 'internal error' });
    }
  };
  app.use(onError);

  return app;
}
