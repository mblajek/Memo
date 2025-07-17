#!/usr/bin/env -S deno --allow-read --allow-write=public/docs --allow-run=git

import {confirmContinue, run} from "./util.ts";

confirmContinue(`\
This script finalises the changelog on develop and then fast-forwards both rc-docs and master-docs to develop.\
Continue?`);
await run("git", "switch", "develop");
await run("./scripts/changelog.ts");
confirmContinue("Finalise the changelog now.\nContinue?");
await run("git", "commit", "-m", "Finalise changelog.");
await run("git", "push");
await run("git", "switch", "rc-docs");
console.log(`Old hash of rc-docs: ${await run("git", "rev-parse", "HEAD")}`);
await run("git", "merge", "--ff-only", "develop");
await run("git", "push");
await run("git", "switch", "master-docs");
console.log(`Old hash of master-docs: ${await run("git", "rev-parse", "HEAD")}`);
await run("git", "merge", "--ff-only", "develop");
await run("git", "push");
console.log("Done");
