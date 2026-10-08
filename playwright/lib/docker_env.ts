import {createHash, randomBytes} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {MemoAPI} from "./api.ts";
import {APP_CACHE_DIR, APP_CONTAINER, artisan, docker} from "./docker_app.ts";
import {DOCKER_ADMIN, DOCKER_DIR, E2E_ROOT, type DockerBase, type DockerConfig} from "./config.ts";
import {readDBConn, readEnv, type DBConn} from "./db_ops_local.ts";
import {log} from "./log.ts";
import {run} from "./process.ts";

/**
 * The environment of a `docker` target: a DB server and an app server in containers of their own,
 * started here and left alone by everything else. The app container serves the checkout with an
 * `.env` of its own — a copy of the checkout's, pointed at the DB container — so the checkout's
 * `.env`, and whatever server runs on it, are only ever read.
 */

const NETWORK = "memo-e2e";
const DB_CONTAINER = "memo-e2e-db";
const DB_IMAGE = "mariadb:11.4";
const DB_NAME = "memo_e2e";
const DB_USER = "memo";

const APP_ENV_FILE = path.join(DOCKER_DIR, "app.env");
const STATE_FILE = path.join(DOCKER_DIR, "state.json");

/** What the running DB container was made with. Written once its DB is ready for the tests. */
interface DockerState {
  readonly dbPassword: string;
  readonly dbPort: number;
  readonly base: DockerBase;
}

function settings(cfg: DockerConfig) {
  const {docker} = cfg;
  return {
    base: docker.base,
    memoDir: path.resolve(E2E_ROOT, docker.memoDir ?? ".."),
    appImage: docker.appImage ?? "memo-memo-php",
    appPort: Number(new URL(cfg.ui.baseURL).port),
    dbPort: docker.dbPort ?? 3307,
    vitePort: docker.vitePort ?? 9085,
    keepRunning: docker.keepRunning ?? true,
  };
}

async function readState(): Promise<DockerState | undefined> {
  try {
    return JSON.parse(await fs.readFile(STATE_FILE, "utf-8")) as DockerState;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
      throw e;
    }
    return undefined;
  }
}

/**
 * The connection to the DB container, from the machine the tests run on, and what tells this DB
 * apart from one made anew in its place.
 */
export async function dockerDB(cfg: DockerConfig): Promise<{readonly conn: DBConn; readonly instance: string}> {
  const state = await readState();
  if (!state) {
    throw new Error("The DB container of the docker target is not set up");
  }
  return {
    conn: {
      host: "127.0.0.1",
      port: String(settings(cfg).dbPort),
      user: DB_USER,
      password: state.dbPassword,
      database: DB_NAME,
    },
    // Each DB container gets a password of its own.
    instance: createHash("sha256").update(state.dbPassword).digest("hex").slice(0, 12),
  };
}

async function succeeds(action: () => Promise<unknown>) {
  try {
    await action();
    return true;
  } catch {
    return false;
  }
}

async function waitFor(what: string, timeoutMs: number, check: () => Promise<boolean>) {
  const deadline = Date.now() + timeoutMs;
  while (!(await check())) {
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

async function isRunning(container: string) {
  return (await docker(["ps", "--quiet", "--filter", `name=^${container}$`])).trim() !== "";
}

async function publishedPorts(container: string) {
  const out = await docker(["port", container]).catch(() => "");
  return new Set([...out.matchAll(/:(\d+)$/gm)].map((m) => Number(m[1])));
}

function mariadb(conn: DBConn, args: readonly string[], stdin?: string | Buffer) {
  return run("mariadb", [`--host=${conn.host}`, `--port=${conn.port}`, `--user=${conn.user}`, conn.database, ...args], {
    env: {MYSQL_PWD: conn.password},
    ...(stdin === undefined ? {} : {stdin}),
  });
}

/**
 * Starts the DB container, with its data in memory: a restore of a snapshot is then several times
 * faster, and a DB to throw away is the point. The data is gone when the container stops.
 */
async function startDB(dbPort: number, dbPassword: string) {
  await succeeds(() => docker(["rm", "--force", DB_CONTAINER]));
  await docker([
    "run",
    "--detach",
    `--name=${DB_CONTAINER}`,
    `--network=${NETWORK}`,
    `--publish=127.0.0.1:${dbPort}:3306`,
    "--tmpfs=/var/lib/mysql:rw,size=2g",
    `--env=MARIADB_DATABASE=${DB_NAME}`,
    `--env=MARIADB_USER=${DB_USER}`,
    `--env=MARIADB_PASSWORD=${dbPassword}`,
    "--env=MARIADB_RANDOM_ROOT_PASSWORD=1",
    DB_IMAGE,
    "--character-set-server=utf8mb4",
    "--collation-server=utf8mb4_0900_ai_ci",
    "--skip-log-bin",
    "--max-allowed-packet=64M",
  ]);
}

/**
 * Writes the `.env` of the app container: the checkout's, with the DB and the address replaced.
 * Written in place, as the file is mounted into the container by itself.
 */
async function writeAppEnv(memoDir: string, baseURL: string, dbPassword: string) {
  const replaced: Readonly<Record<string, string>> = {
    APP_URL: new URL(baseURL).origin,
    DB_HOST: DB_CONTAINER,
    DB_PORT: "3306",
    DB_DATABASE: DB_NAME,
    DB_USERNAME: DB_USER,
    DB_PASSWORD: dbPassword,
    // A socket would be used in place of the host.
    DB_SOCKET: "",
    DB_SSL_VERIFY: "false",
    CACHE_DRIVER: "file",
  };
  const original = await fs.readFile(path.join(memoDir, ".env"), "utf-8");
  const kept = original.split(/\r?\n/).filter((line) => !Object.hasOwn(replaced, line.split("=")[0]!.trim()));
  const lines = [...kept, "", ...Object.entries(replaced).map(([key, value]) => `${key}=${value}`), ""];
  await fs.writeFile(APP_ENV_FILE, lines.join("\n"), {mode: 0o600});
}

const APP_MADE_FROM_LABEL = "memo-e2e.made-from";

// The checkout's storage holds the cache of any other server on the checkout; the app gets a
// cache of its own in its place, which can then be cleared.
const APP_CACHE_MOUNT = `--tmpfs=${APP_CACHE_DIR}:mode=1777`;

/** What the app container is made from, apart from its ports: a change of any calls for a new one. */
async function appMadeFrom(s: ReturnType<typeof settings>) {
  let imageId;
  try {
    imageId = (await docker(["image", "inspect", "--format={{.Id}}", s.appImage])).trim();
  } catch {
    throw new Error(
      `No docker image ${s.appImage} to serve the app with — build the app's own container first ` +
        `(\`docker compose build\` in ${s.memoDir}), or name another image in docker.appImage.`,
    );
  }
  const user = (await readEnv(path.join(s.memoDir, ".env"))).get("CLI_USER") || undefined;
  return {
    user,
    label: createHash("sha256")
      .update(JSON.stringify([imageId, s.memoDir, user, APP_CACHE_MOUNT]))
      .digest("hex"),
  };
}

async function appContainerFits(s: ReturnType<typeof settings>, madeFromLabel: string) {
  if (!(await isRunning(APP_CONTAINER))) {
    return false;
  }
  const ports = await publishedPorts(APP_CONTAINER);
  const label = await docker(["inspect", `--format={{index .Config.Labels "${APP_MADE_FROM_LABEL}"}}`, APP_CONTAINER]);
  return ports.has(s.appPort) && ports.has(s.vitePort) && label.trim() === madeFromLabel;
}

async function startApp(s: ReturnType<typeof settings>, madeFrom: Awaited<ReturnType<typeof appMadeFrom>>) {
  const {user} = madeFrom;
  await succeeds(() => docker(["rm", "--force", APP_CONTAINER]));
  await docker([
    "run",
    "--detach",
    `--name=${APP_CONTAINER}`,
    `--label=${APP_MADE_FROM_LABEL}=${madeFrom.label}`,
    `--network=${NETWORK}`,
    `--publish=127.0.0.1:${s.appPort}:80`,
    `--publish=127.0.0.1:${s.vitePort}:${s.vitePort}`,
    `--volume=${s.memoDir}:/var/www`,
    `--volume=${path.join(s.memoDir, "docker", "php.ini")}:/usr/local/etc/php/php.ini`,
    `--volume=${APP_ENV_FILE}:/var/www/.env:ro`,
    APP_CACHE_MOUNT,
    ...(user ? [`--user=${user}`] : []),
    s.appImage,
  ]);
}

/**
 * Throws unless the app in the container works on the DB of the DB container. It would not with
 * its configuration taken from elsewhere than the `.env` written for it, a cached one for example
 * — and what is done to the DB next would then be done to a DB that is not the tests' own.
 */
async function checkAppUsesOwnDB() {
  const code = 'echo json_encode(array_map(DB::connection()->getConfig(...), ["host", "database", "unix_socket"]));';
  const output = await artisan(["tinker", `--execute=${code}`]);
  const used = /\[.*\]/.exec(output)?.[0];
  const expected = JSON.stringify([DB_CONTAINER, DB_NAME, ""]);
  if (used !== expected) {
    throw new Error(
      `The app in ${APP_CONTAINER} does not use the DB made for the tests: its [host, database, socket] is ` +
        `${used ?? output.trim()}, not ${expected}. Is its configuration cached (bootstrap/cache/config.php)? ` +
        `Nothing was done to that DB.`,
    );
  }
}

/** Makes the DB by the app's migrations. */
async function seedEmpty() {
  await artisan(["migrate", "--force"]);
}

async function createAdmin() {
  const {email, password} = DOCKER_ADMIN;
  // The answers to the questions of the command: the name, the e-mail, whether it is confirmed,
  // the password, whether a global admin, whether the password is expired.
  await artisan(["fz:user"], ["E2E Admin", email, "yes", password, "yes", "no", ""].join("\n"));
}

/** Fills the DB with a copy of the one the checkout's `.env` points at. */
async function seedCopy(memoDir: string, target: DBConn) {
  const source = await readDBConn(path.join(memoDir, ".env"));
  const dump = path.join(DOCKER_DIR, "base.sql");
  try {
    await run(
      "mariadb-dump",
      [
        `--host=${source.host}`,
        `--port=${source.port}`,
        `--user=${source.user}`,
        "--single-transaction",
        "--skip-lock-tables",
        source.database,
      ],
      {env: {MYSQL_PWD: source.password}, stdoutToFile: dump},
    );
    await mariadb(target, [], await fs.readFile(dump));
  } finally {
    await fs.rm(dump, {force: true});
  }
}

async function userExists(conn: DBConn, email: string) {
  // Compared as bytes, which needs no quoting and no matching collation.
  const emailHex = Buffer.from(email, "utf-8").toString("hex");
  const count = await mariadb(conn, [
    "--batch",
    "--skip-column-names",
    `--execute=SELECT COUNT(*) FROM users WHERE email = UNHEX('${emailHex}')`,
  ]);
  return count.trim() !== "0";
}

/** Makes sure the admin can log in, creating the user if its e-mail is free. */
async function ensureAdmin(conn: DBConn) {
  const canLogIn = async () => (await MemoAPI.attemptLogin(DOCKER_ADMIN)).status === 200;
  if (await canLogIn()) {
    return;
  }
  if (await userExists(conn, DOCKER_ADMIN.email)) {
    throw new Error(
      `The new DB already has a user ${DOCKER_ADMIN.email}, who cannot log in as the admin of the tests.`,
    );
  }
  await createAdmin();
  if (!(await canLogIn())) {
    throw new Error(`The admin ${DOCKER_ADMIN.email} was created in the new DB, but cannot log in.`);
  }
}

/**
 * The app serves the address of the dev server from a copy of `public/hot` that it makes once and
 * never renews. Without the copy it makes a new one, from the dev server running now.
 */
async function dropStaleViteAddress(memoDir: string) {
  await fs.rm(path.join(memoDir, "public", "hot!"), {force: true});
}

/** The address of the dev server of the frontend that the app tells the browser to load from. */
async function viteURL(memoDir: string) {
  try {
    const hot = (await fs.readFile(path.join(memoDir, "public", "hot"), "utf-8")).trim();
    return hot.replace("//0.0.0.0", "//localhost").replace("//[::]", "//localhost");
  } catch {
    return undefined;
  }
}

async function viteResponds(memoDir: string) {
  const url = await viteURL(memoDir);
  if (!url) {
    return false;
  }
  try {
    return (await fetch(`${url}/@vite/client`, {signal: AbortSignal.timeout(3000)})).ok;
  } catch {
    return false;
  }
}

/**
 * Sets up the containers of the target, reusing what is there and fits the config: the DB
 * container (with its data, if it was made from the same base), the app container, and the dev
 * server of the frontend — one that runs already, or one started in the app container.
 */
export async function startDockerEnv(cfg: DockerConfig) {
  const s = settings(cfg);
  await fs.mkdir(DOCKER_DIR, {recursive: true});
  await fs.chmod(DOCKER_DIR, 0o700);
  // The directory holds secrets. It ignores itself, so that it is ignored on any branch, whatever
  // the ignore files of that branch say.
  await fs.writeFile(path.join(DOCKER_DIR, ".gitignore"), "*\n");
  if (!(await succeeds(() => docker(["network", "inspect", NETWORK])))) {
    await docker(["network", "create", NETWORK]);
  }

  let state = await readState();
  const dbFits = state?.base === s.base && state.dbPort === s.dbPort && (await isRunning(DB_CONTAINER));
  if (!dbFits) {
    await log.timed(`Docker target: starting the DB container (${DB_IMAGE}, port ${s.dbPort})`, async () => {
      // The state is back only once the DB is seeded: a start that fails midway is made again.
      await fs.rm(STATE_FILE, {force: true});
      state = {dbPassword: randomBytes(16).toString("hex"), dbPort: s.dbPort, base: s.base};
      await startDB(s.dbPort, state.dbPassword);
    });
  }
  const conn: DBConn = {
    host: "127.0.0.1",
    port: String(s.dbPort),
    user: DB_USER,
    password: state!.dbPassword,
    database: DB_NAME,
  };
  await waitFor("the DB container", 120_000, () => succeeds(() => mariadb(conn, ["--execute=SELECT 1"])));

  await writeAppEnv(s.memoDir, cfg.ui.baseURL, state!.dbPassword);
  const madeFrom = await appMadeFrom(s);
  if (!(await appContainerFits(s, madeFrom.label))) {
    await log.timed(`Docker target: starting the app container (${s.appImage}, port ${s.appPort})`, () =>
      startApp(s, madeFrom),
    );
  }
  await waitFor("the app container", 120_000, () =>
    succeeds(() => fetch(new URL("/", cfg.ui.baseURL), {signal: AbortSignal.timeout(5000)})),
  );
  await checkAppUsesOwnDB();

  if (!dbFits) {
    await log.timed(`Docker target: making the DB (${s.base})`, async () => {
      if (s.base === "empty") {
        await seedEmpty();
      } else {
        await seedCopy(s.memoDir, conn);
      }
      await ensureAdmin(conn);
    });
    await fs.writeFile(STATE_FILE, JSON.stringify(state, undefined, 2), {mode: 0o600});
  }

  log.info(`Docker target: the app is at ${cfg.ui.baseURL}, admin ${DOCKER_ADMIN.email} / ${DOCKER_ADMIN.password}`);

  // Asked now: a dev server in an app container that has just been replaced is gone with it.
  if (!(await viteResponds(s.memoDir))) {
    await log.timed(`Docker target: starting the frontend dev server (port ${s.vitePort})`, async () => {
      await docker([
        "exec",
        "--detach",
        APP_CONTAINER,
        "node_modules/.bin/vite",
        `--port=${s.vitePort}`,
        "--strictPort",
      ]);
      await waitFor("the frontend dev server", 180_000, () => viteResponds(s.memoDir));
    });
  }
  // Whichever dev server it is now, the app may still hold the address of an earlier one.
  await dropStaleViteAddress(s.memoDir);
}

export async function stopDockerEnv(cfg: DockerConfig) {
  const s = settings(cfg);
  if (!s.keepRunning) {
    await succeeds(() => docker(["rm", "--force", APP_CONTAINER, DB_CONTAINER]));
    // A dev server killed with its container leaves its address behind, for the app to load from.
    if ((await viteURL(s.memoDir))?.endsWith(`:${s.vitePort}`)) {
      await fs.rm(path.join(s.memoDir, "public", "hot"), {force: true});
    }
    await dropStaleViteAddress(s.memoDir);
  }
}
