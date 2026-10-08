import fs from "node:fs/promises";
import path from "node:path";

/**
 * Writes `data` to `file` so that readers see either the old or the new contents, never a
 * truncated mix — also when the process or the machine dies mid-write. The file is readable by
 * the owner only.
 */
export async function writeFileAtomic(file: string, data: string) {
  const dir = path.dirname(file);
  await fs.mkdir(dir, {recursive: true});
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    const handle = await fs.open(tmp, "w", 0o600);
    try {
      await handle.writeFile(data);
      await handle.sync();
    } finally {
      await handle.close();
    }
    await fs.rename(tmp, file);
  } catch (e) {
    await fs.rm(tmp, {force: true});
    throw e;
  }
  // The rename is durable only once the directory entry is on disk too.
  const dirHandle = await fs.open(dir, "r");
  try {
    await dirHandle.sync();
  } finally {
    await dirHandle.close();
  }
}
