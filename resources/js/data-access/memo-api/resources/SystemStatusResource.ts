export interface SystemStatusResource {
  readonly randomUuid: string;
  readonly currentDate: string;
  readonly commitHash?: string;
  readonly commitDate?: string;
  readonly backendHash: string;
  readonly frontendHash: string;
}
