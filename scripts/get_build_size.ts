#!/usr/bin/env -S deno --allow-read

import * as fs from "jsr:@std/fs";
import * as path from "jsr:@std/path";

const MANIFEST_FILE = "./public/build/manifest.json";

if (!(await fs.exists(MANIFEST_FILE))) {
  console.error(`Manifest file ${MANIFEST_FILE} does not exist`);
  Deno.exit(1);
}
const files = new Set<string>();
let totalSize = 0;
async function addFile(file: string | undefined) {
  if (file && !files.has(file)) {
    files.add(file);
    const fullPath = path.join(path.dirname(MANIFEST_FILE), file);
    if (!(await fs.exists(fullPath))) {
      console.error(`File ${fullPath} does not exist`);
      Deno.exit(1);
    }
    totalSize += (await Deno.stat(fullPath)).size;
  }
}
// deno-lint-ignore no-explicit-any
for (const entry of Object.values(JSON.parse(await Deno.readTextFile(MANIFEST_FILE))) as any[]) {
  await addFile(entry.file);
  for (const css of entry.css || []) {
    await addFile(css);
  }
}
console.log(`The build consists of ${files.size} files, total size: ${totalSize.toLocaleString()} bytes`);
