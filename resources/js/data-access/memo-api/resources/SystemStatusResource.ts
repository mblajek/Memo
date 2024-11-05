export interface SystemStatusResource {
  readonly version: string;
  readonly randomUuid: string;
  readonly currentDate: string;
  readonly commitHash?: string;
  readonly commitDate?: string;
  /** The CPU average load over the last 15 minutes. */
  readonly cpu15m: number;
  readonly appEnv: string;
  readonly appEnvColor: string | null;
  readonly appEnvFgColor: string | null;
  readonly lastDump: string | null;
}
