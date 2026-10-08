/** A checksum of the contents of each table, by table name. */
export type TableChecksums = Readonly<Record<string, string>>;

export interface DBOps {
  /** Tells the DB apart from any other one: the same string whenever it is the same DB. */
  readonly identity: string;
  snapshot(): Promise<string>;
  restore(id: string): Promise<void>;
  /**
   * Returns the checksums of all the tables as they are now. Two equal results mean the same
   * data, the ignored columns (by table) aside. Missing on targets with no cheap way of computing
   * it; the checks built on it are then skipped.
   */
  tableChecksums?(ignoredColumns?: Readonly<Record<string, readonly string[]>>): Promise<TableChecksums>;
  /**
   * Dumps the DB for a human to look at later and returns a reference to the dump. `file` is where
   * to put it on targets that dump to the local disk.
   */
  dumpForInspection(label: string, file: string): Promise<string>;
  dispose(): Promise<void>;
}
