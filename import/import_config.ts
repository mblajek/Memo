import * as JSONC from "https://deno.land/std@0.220.1/jsonc/parse.ts";

export interface ImportConfig {
  /** Path to the prepared facility contents JSON file. */
  readonly preparedFile: string;
  /** Path to the CSV mapping file to create. */
  readonly nnMappingFile: string;
  /** The URL to the Memo app, in the form `https://memo.host/`. */
  readonly memoURL: string;
  readonly facilityId: string;
  readonly importUserMemoSession: string;
  /** Don't actually send the mutating queries. */
  readonly dryRun: boolean;
}

export function readConfig(file: string) {
  return JSONC.parse(Deno.readTextFileSync(file)) as ImportConfig;
}
