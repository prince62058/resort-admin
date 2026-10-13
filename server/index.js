import {config} from './config.js';
import {createApp} from './app.js';
const settings = config();
const server = createApp(settings).listen(settings.port, '0.0.0.0', () => console.log(`Nature Nest admin listening on port ${settings.port}.`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10000).unref();
});
