// Validation preload only; a delivered bootstrap must locate its installed checkout itself.
import { initializeSourceStartup } from './register.mjs';
if (!process.env.DSHM_SOURCE_ROOT) throw Error('Set DSHM_SOURCE_ROOT for the isolated source-start probe');
await initializeSourceStartup(process.env.DSHM_SOURCE_ROOT);
if (process.env.DSHM_STARTUP_PROBE === '1') {
  const originalLog = console.log;
  console.log = (...args) => {
    originalLog(...args);
    if (typeof args[0] === 'string' && args[0].startsWith('dsh web: ')) {
      // A private, newly-created DSH_HOME is used; this never terminates the user's DSH.
      process.stdout.write('DSHM_SOURCE_STARTUP_READY\n');
      setTimeout(() => process.exit(0), 300);
    }
  };
}
