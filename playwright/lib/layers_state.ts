import fs from "node:fs/promises";
import {writeFileAtomic} from "./atomic_write.ts";
import {LAYER_STATE_FILE} from "./config.ts";
import type {TableChecksums} from "./db_ops.ts";
import type {JSONValue} from "./json.ts";

/**
 * Constraint for layer artifacts. Anything returned from a layer's setup must fit this — the
 * artifact is JSON-serialized into the on-disk state file so it can be hydrated in a different
 * worker process. No Map/Set/Date/class instances; primitives and plain objects/arrays only.
 */
export type LayerArtifact = JSONValue;

export interface CachedLayer {
  readonly dumpId: string;
  /** The checksums of the tables at the snapshot, on targets that can compute them. */
  readonly checksums?: TableChecksums;
  /** Hydrated into the layer on cross-process load. */
  readonly artifact: LayerArtifact;
}

/** Identifies what a run's cached layers were built from and against. */
export interface RunStamp {
  /** Target type, origin of the server under test, and a hash identifying its DB. */
  readonly target: string;
  /** Calendar day of the run, local and UTC — layer setups may bake relative dates into dumps. */
  readonly day: string;
  /** Hash of the sources the layer setups are made of. */
  readonly setupHash: string;
}

export interface LayersState {
  /** Maps layer id to its cached snapshot and artifact. */
  readonly cached: Readonly<Record<string, CachedLayer>>;
  /**
   * If the DB is in a clean state defined by a layer, the id of that layer. Missing if the DB is
   * dirty.
   */
  readonly cleanLayerId?: string;
  readonly stamp?: RunStamp;
}

const EMPTY_STATE: LayersState = {cached: {}};

/**
 * On-disk store of layer-snapshot bookkeeping. Every `get` reads fresh from disk — no in-memory
 * cache, because the global setup and its teardown run in Playwright's main process while tests
 * run in worker processes, and the worker's writes need to be visible to the teardown.
 */
export class LayersStateManager {
  async get(file = LAYER_STATE_FILE): Promise<LayersState> {
    try {
      return JSON.parse(await fs.readFile(file, "utf-8")) as LayersState;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") {
        throw e;
      }
      return EMPTY_STATE;
    }
  }

  async update(updater: (s: LayersState) => LayersState) {
    const next = updater(await this.get());
    await writeFileAtomic(LAYER_STATE_FILE, JSON.stringify(next, undefined, 2));
  }
}
