import * as JSONC from "https://deno.land/std@0.220.1/jsonc/parse.ts";

export interface ImportConfig {
  /** Path to the prepared facility contents JSON file. */
  readonly preparedFile: string;
  /** Path to the CSV mapping file to create. Time and extension is appended. */
  readonly nnMappingFileBase: string;
  /** The URL to the Memo app, in the form `https://memo.host/`. */
  readonly memoURL: string;
  readonly facilityId: string;
  readonly importUserMemoSession: string;
  readonly skipDictionariesAndAttributes: boolean;
  /** Suffix to add to staff emails, to avoid duplicates when doing test imports. */
  readonly staffEmailsPrefix: string | undefined;
  /** Don't actually send the mutating queries. */
  readonly dryRun: boolean;
}

export function readConfig(file: string) {
  const data = JSONC.parse(Deno.readTextFileSync(file));
  return new Proxy(data, {
    get(target, prop) {
      if (!Object.hasOwn(target, prop)) {
        throw new Error(`Missing property in config: ${String(prop)}`);
      }
      return target[prop];
    },
  }) as ImportConfig;
}
