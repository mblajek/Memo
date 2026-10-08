import {randomUUID} from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import {STATE_DIR} from "./config.ts";
import type {DBOps, TableChecksums} from "./db_ops.ts";
import {run} from "./process.ts";

export interface DBConn {
  readonly host: string;
  readonly port: string;
  readonly user: string;
  readonly password: string;
  readonly database: string;
}

const DUMPS_DIR = path.join(STATE_DIR, "dumps");

export function dumpFile(id: string) {
  return path.join(DUMPS_DIR, `${id}.sql`);
}

/** The server's default `max_allowed_packet` is 16 MB; a batch stays well below it. */
const MAX_BATCH_BYTES = 4_000_000;

/**
 * Rewrites a dump so that the client sends it in a few large batches, not statement by statement.
 * The client sends everything up to the delimiter as one packet, so changing the delimiter to
 * something the dump does not contain makes a batch of all the statements before it. A restore
 * is otherwise a few hundred statements, each paying the round trip to the server, which is
 * where nearly all its time goes when the server is remote.
 *
 * The dump is taken as a string of its bytes, one character each.
 */
function inBatches(dump: string) {
  if (/^DELIMITER\b/m.test(dump)) {
    throw new Error("The dump sets a delimiter of its own (triggers or routines?) — cannot be sent in batches");
  }
  let delimiter: string;
  do {
    // The client limits a delimiter to 15 characters.
    delimiter = `@@${randomUUID().slice(0, 8)}@@`;
  } while (dump.includes(delimiter));
  const batches: string[] = [];
  let batch: string[] = [];
  let batchBytes = 0;
  for (const line of dump.split("\n")) {
    batch.push(line);
    batchBytes += line.length + 1;
    // A statement of a dump ends at the end of a line; line breaks inside strings are escaped.
    if (batchBytes >= MAX_BATCH_BYTES && line.endsWith(";")) {
      batches.push(batch.join("\n"));
      batch = [];
      batchBytes = 0;
    }
  }
  if (batch.some((line) => line.trim())) {
    batches.push(batch.join("\n"));
  }
  return `DELIMITER ${delimiter}\n${batches.map((b) => `${b}\n${delimiter}\n`).join("")}`;
}

export class LocalDBOps implements DBOps {
  private constructor(
    private readonly conn: DBConn,
    private readonly instance: string | undefined,
  ) {}

  /**
   * `instance` tells apart DBs that the connection settings do not: ones made anew at the same
   * address.
   */
  static create(conn: DBConn, instance?: string) {
    return new LocalDBOps(conn, instance);
  }

  get identity() {
    return `${this.conn.host}:${this.conn.port}/${this.conn.database}${this.instance ? ` #${this.instance}` : ""}`;
  }

  async dispose() {}

  async snapshot() {
    const id = randomUUID();
    await this.dumpTo(dumpFile(id));
    return id;
  }

  async restore(id: string) {
    // Read and sent byte for byte ("latin1"), whatever the encoding of the data in the dump.
    const batches = Buffer.from(inBatches(await fs.readFile(dumpFile(id), "latin1")), "latin1");
    // Compressed: with the round trips gone, the rest of the time is the transfer of the data.
    await this.client(["--compress"], batches);
  }

  async tableChecksums(ignoredColumns: Readonly<Record<string, readonly string[]>> = {}): Promise<TableChecksums> {
    const quoted = (names: readonly string[]) => names.map((name) => `'${name.replaceAll("'", "''")}'`).join(", ");
    const partialTables = Object.keys(ignoredColumns);
    // One call for everything, as each call is a new connection. The statements are built on the
    // server from its list of tables and columns: `CHECKSUM TABLE` for the whole tables, and a
    // sum of the checksums of the rows, over the columns that count, for the other ones.
    const output = await this.client(
      ["--batch", "--skip-column-names"],
      `SET SESSION group_concat_max_len = 1000000;
       SET @statement = (
         SELECT CONCAT('CHECKSUM TABLE ', GROUP_CONCAT(CONCAT('\`', table_name, '\`') ORDER BY table_name))
         FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'
           ${partialTables.length ? `AND table_name NOT IN (${quoted(partialTables)})` : ""}
       );
       PREPARE statement FROM @statement;
       EXECUTE statement;
       ${Object.entries(ignoredColumns)
         .map(
           ([table, columns]) => `
       SET @statement = (
         SELECT CONCAT(
           'SELECT ${quoted([table]).replaceAll("'", "''")}, COALESCE(SUM(CRC32(CONCAT_WS(0x1F, ',
           GROUP_CONCAT(CONCAT('IFNULL(\`', column_name, '\`, 0x00)') ORDER BY ordinal_position),
           '))), 0) FROM \`${table}\`'
         )
         FROM information_schema.columns
         WHERE table_schema = DATABASE() AND table_name = ${quoted([table])}
           AND column_name NOT IN (${quoted(columns)})
       );
       PREPARE statement FROM @statement;
       EXECUTE statement;`,
         )
         .join("")}`,
    );
    const prefix = `${this.conn.database}.`;
    return Object.fromEntries(
      output
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const [table, checksum] = line.split("\t") as [string, string];
          return [table.startsWith(prefix) ? table.slice(prefix.length) : table, checksum];
        }),
    );
  }

  /** Runs the client on the given input, and returns what it printed. */
  private async client(args: readonly string[], input: string | Buffer) {
    return run(
      "mariadb",
      [
        `-h${this.conn.host}`,
        `-P${this.conn.port}`,
        `-u${this.conn.user}`,
        "--default-character-set=utf8mb4",
        ...args,
        this.conn.database,
      ],
      {env: this.env(), stdin: input},
    );
  }

  async dumpForInspection(_label: string, file: string) {
    await this.dumpTo(file);
    return file;
  }

  private env(): Record<string, string> {
    return this.conn.password ? {MYSQL_PWD: this.conn.password} : {};
  }

  private async dumpTo(file: string) {
    await fs.mkdir(path.dirname(file), {recursive: true});
    await run(
      "mariadb-dump",
      [
        `-h${this.conn.host}`,
        `-P${this.conn.port}`,
        `-u${this.conn.user}`,
        "--single-transaction",
        "--quick",
        "--add-drop-table",
        "--default-character-set=utf8mb4",
        this.conn.database,
      ],
      {env: this.env(), stdoutToFile: file},
    );
  }
}

/** The settings of an app's `.env` file. */
export async function readEnv(envFile: string): Promise<ReadonlyMap<string, string>> {
  const text = await fs.readFile(envFile, "utf-8");
  const map = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.trim());
    if (!m) {
      continue;
    }
    const [, key, rawValue] = m;
    map.set(key!, envValue(rawValue!));
  }
  return map;
}

/** The connection settings of the DB an app's `.env` file points at. */
export async function readDBConn(envFile: string): Promise<DBConn> {
  const map = await readEnv(envFile);
  function get(key: string, def?: string) {
    const v = map.get(key);
    if (!v) {
      if (def === undefined) {
        throw new Error(`${envFile} is missing ${key}.`);
      }
      return def;
    }
    return v;
  }
  return {
    host: get("DB_HOST"),
    port: get("DB_PORT", "3306"),
    user: get("DB_USERNAME"),
    password: get("DB_PASSWORD", ""),
    database: get("DB_DATABASE"),
  };
}

/** The value of a line of an `.env` file: a quoted one ends at its quote, another at a comment. */
function envValue(raw: string) {
  const doubleQuoted = /^"((?:[^"\\]|\\.)*)"/.exec(raw);
  if (doubleQuoted) {
    return doubleQuoted[1]!.replace(/\\(.)/g, "$1");
  }
  const singleQuoted = /^'([^']*)'/.exec(raw);
  if (singleQuoted) {
    return singleQuoted[1]!;
  }
  return raw.replace(/\s+#.*$/, "").trim();
}
