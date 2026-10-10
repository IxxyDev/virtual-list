import { createService } from './app/service.ts';
import { createApp } from './http/app.ts';
import { readConfig } from './config.ts';

const config = readConfig(process.env);
const service = createService(config);
const app = createApp(service);

const server = app.listen(config.port, () => {
  console.log(`listening on :${config.port}, add batch ${config.addIntervalMs}ms, change batch ${config.rwIntervalMs}ms`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      service.close();
      process.exit(0);
    });
  });
}
