import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface UIConfig {
  readonly baseURL: string;
  readonly admin: Credentials;
}

export interface DBAPIConfig {
  readonly baseURL: string;
  readonly admin: Credentials;
}

export interface E2EConfigBase {
  readonly ui: UIConfig;
}

export interface RCConfig extends E2EConfigBase {
  readonly targetType: "rc";
  readonly dbAPI: DBAPIConfig;
}

export interface LocalConfig extends E2EConfigBase {
  readonly targetType: "local";
  readonly memoEnvFile: string;
  /** The DB that `memoEnvFile` has to point at. */
  readonly expectedDB: {
    readonly host: string;
    readonly port: number;
    readonly name: string;
  };
}

/**
 * The global admin of a `docker` target, created in its DB. Not a secret: that server is made for
 * the tests and reached from this machine only.
 */
export const DOCKER_ADMIN: Credentials = {email: "e2e-admin@example.com", password: "Memo-E2E-admin-1"};

/** What the DB of a `docker` target starts from. */
export type DockerBase = "empty" | "copy";

export interface DockerConfig extends E2EConfigBase {
  readonly targetType: "docker";
  readonly docker: {
    readonly base: DockerBase;
    /** The checkout of the app to serve; the one this directory is in, if not given. */
    readonly memoDir?: string;
    readonly appImage?: string;
    readonly dbPort?: number;
    readonly vitePort?: number;
    readonly keepRunning?: boolean;
  };
}

export type E2EConfig = RCConfig | LocalConfig | DockerConfig;

const here = path.dirname(fileURLToPath(import.meta.url));
export const E2E_ROOT = path.resolve(here, "..");

function configPath() {
  const envPath = process.env.MEMO_E2E_CONFIG;
  return envPath ? path.resolve(envPath) : path.join(E2E_ROOT, "config", "config.json");
}

let cached: E2EConfig | undefined;

export async function loadConfig() {
  if (cached) {
    return cached;
  }
  const p = configPath();
  let raw: string;
  try {
    raw = await fs.readFile(p, "utf-8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `E2E config not found at ${p}. Copy a file from config/*.template.json to config/config.json ` +
          `and fill it in, or set MEMO_E2E_CONFIG to a different path.`,
      );
    }
    throw e;
  }
  const parsed = JSON.parse(raw) as E2EConfig;
  validate(parsed);
  cached = parsed.targetType === "docker" ? {...parsed, ui: {...parsed.ui, admin: DOCKER_ADMIN}} : parsed;
  return cached;
}

function requireField(name: string, value: unknown) {
  if (!value) {
    throw new Error(`E2E config missing required field: ${name}`);
  }
}

function validateCredentials(prefix: string, c: Credentials | undefined) {
  requireField(`${prefix}.email`, c?.email);
  requireField(`${prefix}.password`, c?.password);
}

function validate(c: E2EConfig) {
  requireField("ui.baseURL", c.ui?.baseURL);
  switch (c.targetType) {
    case "rc":
      validateCredentials("ui.admin", c.ui.admin);
      requireField("dbAPI.baseURL", c.dbAPI?.baseURL);
      validateCredentials("dbAPI.admin", c.dbAPI?.admin);
      break;
    case "local":
      validateCredentials("ui.admin", c.ui.admin);
      requireField("memoEnvFile", c.memoEnvFile);
      requireField("expectedDB.host", c.expectedDB?.host);
      requireField("expectedDB.port", c.expectedDB?.port);
      requireField("expectedDB.name", c.expectedDB?.name);
      break;
    case "docker":
      if (c.docker?.base !== "empty" && c.docker?.base !== "copy") {
        throw new Error(`E2E config: docker.base must be "empty" or "copy"`);
      }
      if ((c.ui as Partial<UIConfig>).admin) {
        throw new Error(
          `E2E config: a docker target takes no ui.admin — its admin is ${DOCKER_ADMIN.email}, created in the new DB`,
        );
      }
      if (!URL.canParse(c.ui.baseURL)) {
        throw new Error(`E2E config: ui.baseURL is not a URL: ${c.ui.baseURL}`);
      }
      // The app container is published on this machine only.
      if (!["localhost", "127.0.0.1"].includes(new URL(c.ui.baseURL).hostname) || !new URL(c.ui.baseURL).port) {
        throw new Error(
          `E2E config: ui.baseURL of a docker target must be on localhost, and name the port to serve the app on`,
        );
      }
      break;
    default:
      throw new Error(
        `E2E config: targetType must be "rc", "local" or "docker", got ${(c as {targetType: string}).targetType}`,
      );
  }
}

export const STATE_DIR = path.join(E2E_ROOT, ".state");
/** Holds what the containers of a `docker` target are made with. Kept from run to run. */
export const DOCKER_DIR = path.join(E2E_ROOT, ".docker");
export const PREV_RUN_DIR = path.join(STATE_DIR, "prev_run");
export const LAYER_STATE_FILE = path.join(STATE_DIR, "layer_state.json");
/** Holds the process id of the run in progress. */
export const RUN_LOCK_FILE = path.join(STATE_DIR, "run.lock");

/** Whether the environment variable is set to anything but an empty string or `0`. */
function envFlag(name: string) {
  const value = process.env[name];
  return !!value && value !== "0";
}

/**
 * When set to a truthy value (e.g. `1`), global setup restores `.state/prev_run/*` back into
 * `.state/` so the previous run's layer dumps and session cache are reused, and the setup of
 * the layers is skipped. Without it the previous run's state is ignored and startup begins fresh.
 */
export function reuseStateEnabled() {
  return envFlag("MEMO_E2E_REUSE_STATE");
}

/**
 * When set to a truthy value, a start that finds the state of a run that did not tear down
 * first brings the DB back to the clean state of that run, and then goes on. Without it such a
 * start is refused: the leftover state may be all that remembers what the DB looked like.
 */
export function recoverEnabled() {
  return envFlag("MEMO_E2E_RECOVER");
}
