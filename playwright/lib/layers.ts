import {test as base} from "@playwright/test";
import {DateTime} from "luxon";
import {createHash} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {MemoAPI, withTimeBudget} from "./api.ts";
import {
  E2E_ROOT,
  LAYER_STATE_FILE,
  PREV_RUN_DIR,
  RUN_LOCK_FILE,
  STATE_DIR,
  loadConfig,
  recoverEnabled,
  reuseStateEnabled,
} from "./config.ts";
import {APP_HOLIDAYS_FILE} from "./dates.ts";
import {getDB} from "./db.ts";
import {dumpFile} from "./db_ops_local.ts";
import type {TableChecksums} from "./db_ops.ts";
import {LayersStateManager, type LayerArtifact, type RunStamp} from "./layers_state.ts";
import {log} from "./log.ts";

export type {LayerArtifact};

const layersState = new LayersStateManager();

/**
 * What the app writes on its own while it is only being looked at, and so is left out when
 * comparing states of the DB: the log with the texts it refers to; and of a user, the facility
 * opened last and the storage of the UI's own state (table and calendar settings and the like),
 * both saved by the UI as pages are opened, with the stamps of those updates.
 */
const VOLATILE_TABLES: ReadonlySet<string> = new Set(["log_entries", "texts"]);
const VOLATILE_COLUMNS = {users: ["last_login_facility_id", "storage", "updated_at", "updated_by"]} as const;

async function dbChecksums() {
  return (await getDB()).tableChecksums?.(VOLATILE_COLUMNS);
}

/** Returns the tables whose contents differ between the two states, the volatile ones aside. */
function changedTables(a: TableChecksums, b: TableChecksums) {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])]
    .filter((table) => !VOLATILE_TABLES.has(table) && a[table] !== b[table])
    .sort();
}

export type LayerSetup<T, P> = (params: {readonly api: MemoAPI; readonly parentArtifact: P}) => Promise<T>;

const SEPARATOR = "❯";

const usedLayerIds = new Set<string>();

/**
 * The key of a layer in the on-disk state. Derived from the name, so it is the same in every
 * process and every run — each worker creates only the layers imported by the spec file it runs,
 * so anything depending on creation order would not be.
 */
function layerId(name: string) {
  const id = name
    .split(SEPARATOR)
    .map((label) =>
      label
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "_"),
    )
    .join(".");
  if (usedLayerIds.has(id)) {
    throw new Error(`Duplicate layer "${name}" (id "${id}")`);
  }
  usedLayerIds.add(id);
  return id;
}

export class Layer<T extends LayerArtifact, P extends LayerArtifact = LayerArtifact> {
  readonly id: string;

  private artifactValue?: {value: T};

  constructor(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly parent: Layer<P, any> | undefined,
    readonly name: string,
    private readonly setup: LayerSetup<T, P>,
  ) {
    this.id = layerId(name);
  }

  createSubLayer<U extends LayerArtifact>(subLabel: string, subSetup: LayerSetup<U, T>): Layer<U, T> {
    if (subLabel.includes(SEPARATOR)) {
      throw new Error(`Layer label cannot include separator character "${SEPARATOR}": "${subLabel}"`);
    }
    const name = this.parent ? `${this.name} ${SEPARATOR} ${subLabel}` : subLabel;
    return new Layer<U, T>(this, name, subSetup);
  }

  describe(body: (artifact: () => T) => void) {
    base.describe(this.name, () => {
      let prevActive: typeof activeLayer;
      base.beforeAll(async () => {
        prevActive = activeLayer;
        activeLayer = this;
        // The default 60s hook timeout is not enough — Playwright doesn't accept a timeout option
        // on beforeAll(), so it is extended from inside the hook.
        await withTimeBudget(5 * 60_000, () => this.load());
      });
      base.afterAll(() => {
        activeLayer = prevActive;
      });
      body(() => this.getArtifact());
    });
  }

  /**
   * The artifact produced by this layer's setup. Only valid while the layer is active — i.e. inside
   * a sub-layer's setup, or a `describe` body for this layer or any of its descendants.
   */
  getArtifact(): T {
    if (!this.artifactValue) {
      throw new Error(`Layer "${this.name}" is not active.`);
    }
    return this.artifactValue.value;
  }

  /**
   * Brings the DB to a state matching this layer's snapshot. Walks up from this layer until it
   * finds a cached ancestor, restores from it if needed, then runs setup + snapshot for each
   * missing layer down to this one. A no-op (and no log) if the DB already matches this layer's
   * snapshot.
   *
   * The root layer's snapshot is whatever the DB holds at that moment, so it is made only where
   * that is known to be the clean state: with `createRoot`. Otherwise a missing one is an error —
   * the state of the run is gone, and the DB may hold anything.
   */
  async load({createRoot = false} = {}) {
    const {cached, cleanLayerId} = await layersState.get();
    // The artifacts are in the memory of the process that ran the setups: another process takes
    // them from the cache. A layer that has its artifact has those of its ancestors too.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let l: Layer<any, any> | undefined = this;
    while (l && !l.artifactValue) {
      if (cached[l.id]) {
        l.artifactValue = {value: cached[l.id]!.artifact};
      }
      l = l.parent;
    }
    const toSetUp: Layer<LayerArtifact>[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let anchor: Layer<any, any> | undefined = this;
    while (anchor && !cached[anchor.id]) {
      toSetUp.unshift(anchor);
      anchor = anchor.parent;
    }
    if (!anchor && !createRoot) {
      throw new Error(
        `The state of the run is gone from ${LAYER_STATE_FILE} — another run, or a setup or teardown of this ` +
          `one, got in the way. The DB may be dirty: start the run anew.`,
      );
    }
    const needsRestore = !!anchor && cleanLayerId !== anchor.id;
    if (!needsRestore && !toSetUp.length) {
      log.info(`Layer "${this.name}" load: already clean`);
      return;
    }
    await log.timed(`Layer "${this.name}" load`, async () => {
      const db = await getDB();
      if (needsRestore && anchor) {
        // Dirty first: a restore that fails or is cut off must not leave the DB marked as matching
        // the layer it was in before.
        await markDirty();
        await db.restore(cached[anchor.id]!.dumpId);
        await layersState.update((s) => ({...s, cleanLayerId: anchor.id}));
      }
      if (!toSetUp.length) {
        return;
      }
      const cfg = await loadConfig();
      const mainApi = await MemoAPI.spawn();
      try {
        for (const node of toSetUp) {
          // Each setup gets its own admin-logged-in child. The setup is free to mutate session
          // state (e.g. re-login as another user) without affecting any other setup in the chain.
          // Children accumulate under mainApi and are disposed wholesale at the end.
          const api = await mainApi.loggedInAs(cfg.ui.admin);
          const parentArtifact = node.parent?.getArtifact();
          // Dirty before the setup changes anything: an interruption at any point, also one that
          // does not surface as a throw, then makes the next load restore.
          await markDirty();
          const artifact = await log.timed(`Layer "${node.name}" setup`, () => node.setup({api, parentArtifact}));
          // Through JSON, so that this process sees exactly what a process hydrating the artifact
          // from the state file will.
          node.artifactValue = {value: artifact === undefined ? artifact : JSON.parse(JSON.stringify(artifact))};
          const dumpId = await db.snapshot();
          const checksums = await dbChecksums();
          await layersState.update((s) => ({
            ...s,
            cached: {
              ...s.cached,
              [node.id]: {dumpId, artifact: node.artifactValue!.value, ...(checksums ? {checksums} : {})},
            },
            cleanLayerId: node.id,
          }));
        }
      } finally {
        await mainApi.dispose();
      }
    });
  }
}

const rootLayer = new Layer<undefined>(undefined, "root", async () => undefined);

/**
 * Registers a top-level layer (its parent is the root). The setup gets just `{api}` — top-level
 * layers have no meaningful parent artifact.
 */
export function createLayer<T extends LayerArtifact>(
  label: string,
  setup: (params: {api: MemoAPI}) => Promise<T>,
): Layer<T, undefined> {
  return rootLayer.createSubLayer(label, ({api}) => setup({api}));
}

/**
 * The layer the next test should logically run inside. Pushed by describe.beforeAll, popped by
 * describe.afterAll. Worker-local in memory.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let activeLayer: Layer<any, any> = rootLayer;

/** Brings the DB to a state matching the currently active layer. */
export async function loadActiveLayer() {
  await activeLayer.load();
}

/** Marks the DB as no longer matching any layer snapshot. */
export async function markDirty() {
  await layersState.update(({cleanLayerId: _, ...s}) => s);
}

/**
 * Returns the tables in which the DB differs from the snapshot of the active layer; none if the
 * target cannot tell. Meant for right after something that should have left the DB as it was.
 */
export async function tablesChangedSinceActiveLayer() {
  const expected = (await layersState.get()).cached[activeLayer.id]?.checksums;
  const actual = await dbChecksums();
  return expected && actual ? changedTables(expected, actual) : [];
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // No permission to signal it: it exists.
    return (e as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Claims the state directory and the DB for this run. Throws if another run is in progress: two
 * runs would restore the DB under each other.
 */
export async function acquireRunLock() {
  await fs.mkdir(STATE_DIR, {recursive: true});
  // It holds dumps of the DB and the sessions of users.
  await fs.chmod(STATE_DIR, 0o700);
  // The lock is made as a link to a file that already has the process id in it: it appears
  // whole or not at all, and of two runs starting at once only one gets it.
  const ownFile = `${RUN_LOCK_FILE}.${process.pid}`;
  await fs.writeFile(ownFile, String(process.pid));
  try {
    for (const lastTry of [false, true]) {
      try {
        await fs.link(ownFile, RUN_LOCK_FILE);
        return;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") {
          throw e;
        }
      }
      const readLock = async (file: string) => (await fs.readFile(file, "utf-8").catch(() => "")).trim();
      const lockedBy = await readLock(RUN_LOCK_FILE);
      const refuse = () =>
        new Error(
          `Refusing to start: another Memo E2E run is in progress (process ${lockedBy || "unknown"}). ` +
            `Runs share one DB and ${STATE_DIR}. If that process is not a test run, delete ${RUN_LOCK_FILE}.`,
        );
      // Left by a process that is gone, or by one whose id this process got. A lock that cannot
      // be read counts as held.
      const stale = /^\d+$/.test(lockedBy) && (Number(lockedBy) === process.pid || !isProcessAlive(Number(lockedBy)));
      if (lastTry || !stale) {
        throw refuse();
      }
      // Taken away by renaming, so that only one of the runs that found it stale gets it; if what
      // was renamed is not what was read, it is the new lock of such a run, and goes back.
      const staleFile = `${ownFile}.stale`;
      try {
        await fs.rename(RUN_LOCK_FILE, staleFile);
      } catch {
        continue;
      }
      if ((await readLock(staleFile)) !== lockedBy) {
        await fs.rename(staleFile, RUN_LOCK_FILE);
        throw refuse();
      }
      await fs.rm(staleFile, {force: true});
    }
  } finally {
    await fs.rm(ownFile, {force: true});
  }
}

export async function releaseRunLock() {
  await fs.rm(RUN_LOCK_FILE, {force: true});
}

/**
 * Deals with leftover state of a previous run that did not reach its teardown: its cached dumps
 * are still around and the DB is presumed to be in some intermediate state, not the clean
 * baseline. With recovery enabled, restores that run's root dump and archives its state as a
 * teardown would have. Otherwise throws, with instructions for the operator.
 */
async function recoverOrRefuseIfStale(stamp: RunStamp) {
  const {cached, stamp: staleStamp} = await layersState.get();
  if (!Object.keys(cached).length) {
    return;
  }
  const rootDumpId = cached[rootLayer.id]?.dumpId;
  if (staleStamp && staleStamp.target !== stamp.target) {
    // Its dumps are of another DB: restoring one here would destroy this one.
    throw new Error(
      `Refusing to start: ${LAYER_STATE_FILE} is of a run against another target (${staleStamp.target}) that ` +
        `did not tear down. Run against that target with MEMO_E2E_RECOVER=1 first — or, if its DB is gone ` +
        `(the DB container of a docker target made anew), delete ${STATE_DIR}.`,
    );
  }
  if (recoverEnabled() && rootDumpId) {
    log.warn("Found the state of a run that did not tear down — restoring its clean DB state first");
    await markDirty();
    await rootLayer.load();
    await archiveToPrevRun();
    return;
  }
  const how =
    (await loadConfig()).targetType === "rc"
      ? "via the admin UI"
      : `by loading ${dumpFile(rootDumpId ?? "<id>")} into the DB with the mariadb client`;
  const lines = [
    `Refusing to start: ${LAYER_STATE_FILE} already exists from a previous run that did not tear down.`,
    `The DB is likely dirty. Nothing was changed. To recover:`,
    ...(rootDumpId
      ? [
          `  - Run again with MEMO_E2E_RECOVER=1 to have dump "${rootDumpId}" restored — the clean state at the start of`,
          `    that run; anything changed in the DB since then is lost — and the run started.`,
          `  - Or restore that dump yourself ${how}, delete ${LAYER_STATE_FILE} and run again.`,
        ]
      : [`  - Restore the appropriate clean-state dump ${how}, delete ${LAYER_STATE_FILE} and run again.`]),
  ];
  log.error(lines.join("\n"));
  throw new Error(lines[0]);
}

/**
 * Archives everything in `.state/` (layer dumps, layer_state.json, sessions.json) into
 * `.state/prev_run/` so the next run can opt into reusing it via `MEMO_E2E_REUSE_STATE=1`. The
 * previous `prev_run` is wiped first. Default mode (no env var on next setup) effectively
 * discards the archive — the next setup will start fresh without ever looking at `prev_run`.
 */
async function archiveToPrevRun() {
  await fs.rm(PREV_RUN_DIR, {recursive: true, force: true});
  let entries: string[];
  try {
    entries = await fs.readdir(STATE_DIR);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw e;
  }
  await fs.mkdir(PREV_RUN_DIR, {recursive: true});
  for (const entry of entries) {
    if (entry === "prev_run" || entry.startsWith(path.basename(RUN_LOCK_FILE))) {
      continue;
    }
    await fs.rename(path.join(STATE_DIR, entry), path.join(PREV_RUN_DIR, entry));
  }
}

async function currentStamp(): Promise<RunStamp> {
  const cfg = await loadConfig();
  // Everything a layer's setup may be made of: a list of the files in use now would go stale.
  const libDir = path.join(E2E_ROOT, "lib");
  const libFiles = (await fs.readdir(libDir, {recursive: true, withFileTypes: true}))
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
  const hash = createHash("sha256");
  for (const source of [...libFiles, APP_HOLIDAYS_FILE]) {
    hash.update(`${path.relative(E2E_ROOT, source)}\0`).update(await fs.readFile(source));
  }
  // As a hash: where the DB is does not belong in a state file or in a message.
  const dbHash = createHash("sha256")
    .update((await getDB()).identity)
    .digest("hex")
    .slice(0, 12);
  const now = DateTime.now();
  return {
    target: `${cfg.targetType} ${new URL(cfg.ui.baseURL).origin} (DB ${dbHash})`,
    day: `${now.toISODate()} (UTC ${now.toUTC().toISODate()})`,
    setupHash: hash.digest("hex"),
  };
}

/**
 * Restores `.state/prev_run/*` back into `.state/` (overwriting any current contents). No-op if
 * `prev_run` does not exist, or was made by a run whose stamp differs from `stamp` — its dumps
 * would not be what the layers describe now — or if the DB is no longer in the clean state that
 * run left it in: reusing its dumps would undo whatever was done to the DB since. A target that
 * cannot tell whether the DB changed gets no reuse. After calling, the state is whatever the last
 * run left at teardown: the root layer and the layers under it are cached, tests reuse their
 * snapshots, and the DB is in the state of the root layer.
 *
 * Returns whether the state was restored.
 */
async function restoreFromPrevRun(stamp: RunStamp) {
  let entries: string[];
  try {
    entries = await fs.readdir(PREV_RUN_DIR);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      log.warn("Cannot restore from prev_run: .state/prev_run does not exist");
      return false;
    }
    throw e;
  }
  const prevState = await layersState.get(path.join(PREV_RUN_DIR, path.basename(LAYER_STATE_FILE)));
  const prevStamp = prevState.stamp;
  const changed = (["target", "day", "setupHash"] as const).filter((key) => prevStamp?.[key] !== stamp[key]);
  if (changed.length) {
    const why = prevStamp ? `${changed.join(", ")} changed since it was made` : "it has no run stamp";
    log.warn(`Not reusing .state/prev_run (${why}) — starting fresh`);
    return false;
  }
  const rootChecksums = prevState.cached[rootLayer.id]?.checksums;
  const checksumsNow = rootChecksums && (await dbChecksums());
  if (!rootChecksums || !checksumsNow) {
    log.warn("Not reusing .state/prev_run: no way to tell on this target whether the DB changed since that run");
    return false;
  }
  const changedInDB = changedTables(rootChecksums, checksumsNow);
  if (changedInDB.length) {
    log.warn(
      `Not reusing .state/prev_run: the DB changed since that run (tables: ${changedInDB.join(", ")}) — ` +
        `starting fresh from the DB as it is now`,
    );
    return false;
  }
  await fs.mkdir(STATE_DIR, {recursive: true});
  for (const entry of entries) {
    const dest = path.join(STATE_DIR, entry);
    await fs.rm(dest, {recursive: true, force: true});
    await fs.rename(path.join(PREV_RUN_DIR, entry), dest);
  }
  await fs.rm(PREV_RUN_DIR, {recursive: true, force: true});
  log.info("Restored state from .state/prev_run");
  return true;
}

/**
 * Starts a run, with the run lock held: deals with what the previous run left, and brings the DB
 * to the root layer's snapshot. Throws if the run cannot start; a refusal (leftover state with no
 * recovery asked for) changes neither the DB nor the state. After a successful call the run must
 * end with `endRun`.
 */
export async function startRun() {
  const stamp = await currentStamp();
  await recoverOrRefuseIfStale(stamp);
  if (reuseStateEnabled() && (await restoreFromPrevRun(stamp))) {
    await layersState.update((s) => ({...s, cleanLayerId: rootLayer.id}));
  } else {
    await layersState.update((s) => ({...s, stamp}));
  }
  await rootLayer.load({createRoot: true});
}

/**
 * Ends a run started with `startRun`: brings the DB back to the root layer's snapshot, and
 * archives the state (layer dumps and sessions) to `prev_run/`, where the next run finds it if
 * told to reuse it.
 */
export async function endRun() {
  await rootLayer.load();
  await archiveToPrevRun();
}
