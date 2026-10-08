import {DateTime} from "luxon";

function now() {
  return DateTime.now().toFormat("HH:mm:ss.SSS");
}

export const log = {
  info(...args: unknown[]) {
    console.log(`[${now()}]`, ...args);
  },

  warn(...args: unknown[]) {
    console.warn(`[${now()}] WARN`, ...args);
  },

  error(...args: unknown[]) {
    console.error(`[${now()}] ERROR`, ...args);
  },

  async timed<T>(name: string, fn: () => Promise<T>) {
    const start = Date.now();
    log.info(`${name} start`);
    try {
      const r = await fn();
      log.info(`${name} end (+${((Date.now() - start) / 1000).toFixed(2)}s)`);
      return r;
    } catch (e) {
      log.warn(`${name} FAILED (+${((Date.now() - start) / 1000).toFixed(2)}s)`);
      throw e;
    }
  },
};
