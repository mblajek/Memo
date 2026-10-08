import {DateTime} from "luxon";
import {MemoAPI, type TQuery} from "./api.ts";
import {createdId} from "./responses.ts";
import type {DBAPIConfig} from "./config.ts";
import type {DBOps} from "./db_ops.ts";

const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 2 * 60_000;
/**
 * The server names the file of a dump by the second the dump was asked for, so two dumps asked
 * for in one second share a file — that of the later one.
 */
const MIN_SNAPSHOT_SPACING_MS = 1500;

interface Dump {
  readonly id: string;
  readonly status: string;
  readonly createdAt: string;
  readonly isFromRc: boolean;
}

export class APIDBOps implements DBOps {
  // A snapshot of another process may have been asked for just now.
  private lastSnapshotMillis = Date.now();

  private constructor(
    private readonly api: MemoAPI,
    readonly identity: string,
  ) {}

  static async create(cfg: DBAPIConfig) {
    const api = await MemoAPI.spawn(cfg.admin, cfg.baseURL);
    return new APIDBOps(api, new URL(cfg.baseURL).origin);
  }

  async dispose() {
    await this.api.dispose();
  }

  async snapshot() {
    const wait = this.lastSnapshotMillis + MIN_SNAPSHOT_SPACING_MS - Date.now();
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    const id = await createdId(await this.api.post("admin/db-dump", {isFromRc: true}));
    // The dump was asked for, at the latest, now.
    this.lastSnapshotMillis = Date.now();
    await this.waitForStatus(id, "created");
    await this.checkFileIsOwn(id);
    return id;
  }

  /**
   * Throws if the dump shares its file with another one: a dump of the same DB that anyone asked
   * for in the same second, whether made already or not.
   */
  private async checkFileIsOwn(id: string) {
    const second = (dump: Dump) => DateTime.fromISO(dump.createdAt).startOf("second").toMillis();
    const latest = await this.dumps({sort: [{column: "createdAt", desc: true}], pageSize: 20});
    const own = latest.find((dump) => dump.id === id);
    if (!own) {
      throw new Error(`db-dump ${id} is not among the latest dumps — cannot tell whether its file is its own`);
    }
    const sharing = latest.filter((dump) => dump.id !== id && dump.isFromRc && second(dump) === second(own));
    if (sharing.length) {
      throw new Error(
        `db-dump ${id} shares its file with ${sharing.map((dump) => dump.id).join(", ")}, asked for in the same ` +
          `second: the file has the contents of only one of them, so none of them can be relied on`,
      );
    }
  }

  private async dumps(query: Pick<TQuery, "filter" | "sort" | "pageSize">) {
    const columns = ["id", "status", "createdAt", "isFromRc"] satisfies (keyof Dump)[];
    return (await this.api.tquery<Dump>("admin/db-dump/tquery", {columns, ...query})).rows;
  }

  async restore(id: string) {
    await this.api.post(`admin/db-dump/${id}/restore`, {isToRc: true});
    await this.waitForStatus(id, "created", ["restoring"]);
  }

  // The admin DB API has no DELETE endpoint; dumps accumulate server-side until manually pruned.
  async dumpForInspection(label: string) {
    const id = await this.snapshot();
    return `db-dump id=${id} label=${label}`;
  }

  private async waitForStatus(id: string, desired: string, allowIntermediate: string[] = []) {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const status = await this.getStatus(id);
      if (status === desired) {
        return;
      }
      if (status === "create_error" || status === "restore_error") {
        throw new Error(`db-dump ${id} entered error state: ${status}`);
      }
      if (status !== "creating" && !allowIntermediate.includes(status)) {
        throw new Error(`db-dump ${id} unexpected status: ${status}`);
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    throw new Error(`db-dump ${id} did not reach status=${desired} within ${POLL_TIMEOUT_MS}ms`);
  }

  private async getStatus(id: string) {
    const dump = (await this.dumps({filter: {type: "column", column: "id", op: "=", val: id}}))[0];
    if (!dump) {
      throw new Error(`db-dump ${id} not found in tquery`);
    }
    return dump.status;
  }
}
