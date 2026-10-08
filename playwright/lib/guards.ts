import type {E2EConfig, LocalConfig} from "./config.ts";
import {readDBConn, readEnv} from "./db_ops_local.ts";

/**
 * The value of the app's `APP_ENV` that marks a server, or a DB, as one not to run tests on.
 * The other values are free text, also that of a server meant for the tests.
 */
const PRODUCTION_APP_ENV = "production";

function refusal(why: string) {
  return new Error(`Refusing to run the tests: ${why} Nothing was changed.`);
}

/**
 * The connection to the DB of a `local` target — which the tests restore over and over, losing
 * whatever anyone else does in it meanwhile. Throws unless it is the DB the config names, and
 * unless the `.env` it is read from is not of the production environment.
 */
export async function localDBConn(cfg: LocalConfig) {
  const appEnv = (await readEnv(cfg.memoEnvFile)).get("APP_ENV");
  // The app does not start without it, so one not found is one not understood.
  if (!appEnv || appEnv === PRODUCTION_APP_ENV) {
    throw refusal(appEnv ? `${cfg.memoEnvFile} has APP_ENV=${appEnv}.` : `no APP_ENV found in ${cfg.memoEnvFile}.`);
  }
  const conn = await readDBConn(cfg.memoEnvFile);
  const {host, port, name} = cfg.expectedDB;
  const mismatches = [
    conn.host === host ? undefined : `host ${conn.host}, not ${host}`,
    conn.port === String(port) ? undefined : `port ${conn.port}, not ${port}`,
    conn.database === name ? undefined : `database ${conn.database}, not ${name}`,
  ].filter((mismatch) => mismatch !== undefined);
  if (mismatches.length) {
    throw refusal(
      `${cfg.memoEnvFile} points at another DB than the config expects (${mismatches.join("; ")}). ` +
        `If that DB is the one to run the tests on, name it in expectedDB of the config.`,
    );
  }
  return conn;
}

async function appEnvOf(baseURL: string) {
  const url = new URL("/api/v1/system/status", baseURL);
  let res;
  try {
    res = await fetch(url, {signal: AbortSignal.timeout(30_000)});
  } catch (e) {
    throw new Error(`Cannot reach the app at ${url.origin}: ${(e as Error).message}`, {cause: e});
  }
  if (!res.ok) {
    throw new Error(`Cannot tell the environment of the app at ${url.origin}: status ${res.status} from ${url}`);
  }
  const appEnv = ((await res.json()) as {data?: {appEnv?: unknown}}).data?.appEnv;
  if (typeof appEnv !== "string" || !appEnv) {
    throw new Error(`Cannot tell the environment of the app at ${url.origin}: ${url} does not give it`);
  }
  return appEnv;
}

/**
 * Throws if the server the tests would drive is one that tests must not run on. To be called
 * before anything is done to the target: the tests fill the server's DB with their data.
 */
export async function checkServerIsForTests(cfg: E2EConfig) {
  // A docker target serves the app itself, from its own DB.
  if (cfg.targetType === "docker") {
    return;
  }
  if (cfg.targetType === "rc" && new URL(cfg.ui.baseURL).origin === new URL(cfg.dbAPI.baseURL).origin) {
    throw refusal(
      `ui.baseURL and dbAPI.baseURL are the same server (${new URL(cfg.ui.baseURL).origin}). The DB dump API ` +
        `handles the rc DB of the deployment it is on, so the server it is on is not the rc server.`,
    );
  }
  const appEnv = await appEnvOf(cfg.ui.baseURL);
  if (appEnv === PRODUCTION_APP_ENV) {
    throw refusal(`the app at ui.baseURL (${new URL(cfg.ui.baseURL).origin}) reports the environment "${appEnv}".`);
  }
}
