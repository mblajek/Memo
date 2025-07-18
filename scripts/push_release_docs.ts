#!/usr/bin/env -S deno --allow-read --allow-write=public/docs --allow-run

import * as fs from "jsr:@std/fs";
import {confirmContinue, run} from "./util.ts";

const GIT_PUSH = true;

async function gitPush() {
  if (GIT_PUSH) {
    await run(["git", "push"]);
  } else {
    console.log("Skipping git push");
  }
}

confirmContinue(`\
This script finalises the changelog on develop and then fast-forwards both rc-docs and master-docs to develop.
Continue?`);
await run(["git", "switch", "develop"]);
await run(["./scripts/changelog.ts"], {stdin: "inherit", stdout: "inherit", stderr: "inherit"});
confirmContinue("Make any final adjustments in the changelog and confirm when done.");
await run([
  "git",
  "add",
  ...(await Array.fromAsync(await fs.expandGlob("public/docs/*/changelog"))).map((e) => e.path),
]);
await run(["git", "commit", "-m", "Finalise changelog."]);
await gitPush();
await run(["git", "switch", "rc-docs"]);
console.log(`Old hash of rc-docs: ${(await run(["git", "rev-parse", "HEAD"])).trim()}`);
await run(["git", "merge", "--ff-only", "develop"]);
await gitPush();
await run(["git", "switch", "master-docs"]);
console.log(`Old hash of master-docs: ${(await run(["git", "rev-parse", "HEAD"])).trim()}`);
await run(["git", "merge", "--ff-only", "develop"]);
await gitPush();
await run(["git", "switch", "develop"]);
console.log("Done");
