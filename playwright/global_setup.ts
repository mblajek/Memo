import type {FullConfig} from "@playwright/test";
import {loadConfig} from "./lib/config.ts";
import {disposeDB} from "./lib/db.ts";
import {startDockerEnv, stopDockerEnv} from "./lib/docker_env.ts";
import {checkServerIsForTests} from "./lib/guards.ts";
import {acquireRunLock, endRun, releaseRunLock, startRun} from "./lib/layers.ts";

export default async function globalSetup(config: FullConfig) {
  if (config.workers !== 1) {
    throw new Error(`Memo E2E needs exactly one worker (all tests share one DB), got ${config.workers}.`);
  }
  const cfg = await loadConfig();
  await checkServerIsForTests(cfg);
  // Before anything is touched: the containers too are those of the run in progress.
  await acquireRunLock();
  try {
    if (cfg.targetType === "docker") {
      await startDockerEnv(cfg);
    }
    await startRun();
  } catch (e) {
    await releaseRunLock();
    throw e;
  } finally {
    await disposeDB();
  }
  // Return a teardown that only runs if the setup succeeded.
  return async () => {
    try {
      await endRun();
    } finally {
      await disposeDB();
      try {
        if (cfg.targetType === "docker") {
          await stopDockerEnv(cfg);
        }
      } finally {
        await releaseRunLock();
      }
    }
  };
}
