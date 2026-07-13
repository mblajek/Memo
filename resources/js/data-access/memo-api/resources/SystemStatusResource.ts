export interface SystemStatusResource {
  readonly version: string;
  readonly commitHash: string | null;
  readonly commitDate: string | null;
  /** The CPU average load over the last 15 minutes. Present only for a global admin. */
  readonly cpu15m?: number | null;
  /** The free disk space in megabytes. Present only for a global admin. */
  readonly freeDiskSpaceMb?: number | null;
  readonly appEnv: string;
  readonly appEnvColor: string | null;
  readonly appEnvFgColor: string | null;
  readonly randomUuid: string;
  readonly currentDate: string;
  readonly userTimezone: string;
  readonly dumpsEnabled: boolean;
  readonly lastDump: string | null;
  readonly integrationEvents?: IntegrationEventsStatus;
}

export interface IntegrationEventsStatus {
  readonly last: IntegrationEventsLastEvent | null;
  readonly listeners: readonly IntegrationEventsListenerStatus[];
}

export interface IntegrationEventsLastEvent {
  readonly seq: number;
  readonly createdAt: string;
}

export interface IntegrationEventsListenerStatus {
  readonly listenerCode: string;
  readonly lastProcessedEventSeq: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}
