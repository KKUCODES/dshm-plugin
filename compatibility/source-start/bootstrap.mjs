import { fileURLToPath } from 'node:url';
import { initializeSourceStartup } from './register.mjs';

// Installed in <DSH checkout>/.dshm-source; no test environment variables are needed.
await initializeSourceStartup(fileURLToPath(new URL('../', import.meta.url)));
