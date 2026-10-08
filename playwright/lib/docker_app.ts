import {run} from "./process.ts";

export const APP_CONTAINER = "memo-e2e-php";

/** Where the app in the container keeps its cache: a directory of the container's own. */
export const APP_CACHE_DIR = "/var/www/storage/framework/cache/data";

export const docker = (args: readonly string[], stdin?: string) =>
  run("docker", args, stdin === undefined ? {} : {stdin});

/** Runs an artisan command of the app in the container, and returns its output. */
export const artisan = (args: readonly string[], stdin?: string) =>
  docker(["exec", ...(stdin === undefined ? [] : ["--interactive"]), APP_CONTAINER, "php", "artisan", ...args], stdin);

/** Clears the cache of the app in the container, and with it the counts of its request throttles. */
export async function clearAppCache() {
  await artisan(["cache:clear"]);
}
