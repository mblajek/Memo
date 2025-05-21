export interface SystemStatusResource {
  readonly version: string;
  readonly commitHash: string | null;
  readonly commitDate: string | null;
  /** The CPU average load over the last 15 minutes. */
  readonly cpu15m: number | null;
  readonly appEnv: string;
  readonly appEnvColor: string | null;
  readonly appEnvFgColor: string | null;
  readonly randomUuid: string;
  readonly currentDate: string;
  readonly userTimezone: string;
  readonly lastDump: string | null;
}
