export interface SystemStatusResource {
  readonly version: string;
  readonly randomUuid: string;
  readonly currentDate: string;
  readonly commitHash?: string;
  readonly commitDate?: string;
  readonly backendHash: string;
  readonly frontendHash: string;
  /** The CPU average load over the last 15 minutes. */
  readonly cpu15m: number;
}
