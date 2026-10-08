import {type E2EConfig, loadConfig} from "./config.ts";
import type {DBOps} from "./db_ops.ts";
import {LocalDBOps} from "./db_ops_local.ts";
import {APIDBOps} from "./db_ops_rc.ts";
import {dockerDB} from "./docker_env.ts";
import {localDBConn} from "./guards.ts";
import {log} from "./log.ts";

async function createDBOps(cfg: E2EConfig): Promise<DBOps> {
  switch (cfg.targetType) {
    case "rc":
      return APIDBOps.create(cfg.dbAPI);
    case "local":
      return LocalDBOps.create(await localDBConn(cfg));
    case "docker": {
      const {conn, instance} = await dockerDB(cfg);
      return LocalDBOps.create(conn, instance);
    }
  }
}

/**
 * Wraps DBOps so every operation that changes something or takes long is logged, the long ones
 * with `log.timed`.
 */
function withLogging(ops: DBOps): DBOps {
  return {
    identity: ops.identity,
    snapshot: () => log.timed("DB snapshot", () => ops.snapshot()),
    restore: (id) => log.timed(`DB restore ${id}`, () => ops.restore(id)),
    ...(ops.tableChecksums ? {tableChecksums: (ignoredColumns) => ops.tableChecksums!(ignoredColumns)} : {}),
    dumpForInspection: (label, file) =>
      log.timed(`DB dump for inspection (${label})`, () => ops.dumpForInspection(label, file)),
    async dispose() {
      await ops.dispose();
      log.info("DB disposed");
    },
  };
}

let cached: DBOps | undefined;

export async function getDB() {
  if (!cached) {
    cached = withLogging(await createDBOps(await loadConfig()));
  }
  return cached;
}

export async function disposeDB() {
  if (cached) {
    await cached.dispose();
    cached = undefined;
  }
}
