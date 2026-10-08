import {spawn} from "node:child_process";
import fs from "node:fs/promises";

export interface RunOptions {
  readonly env?: Readonly<Record<string, string>>;
  readonly stdin?: string | Buffer;
  /** Where the output goes, readable by the owner only. Without it the output is returned. */
  readonly stdoutToFile?: string;
}

/**
 * Runs the command to its end; returns its output, or throws with its error output — with the end
 * of its output, if it wrote no errors.
 */
export async function run(cmd: string, args: readonly string[], opts: RunOptions = {}) {
  const stdout = opts.stdoutToFile ? await fs.open(opts.stdoutToFile, "w", 0o600) : undefined;
  try {
    return await new Promise<string>((resolve, reject) => {
      const child = spawn(cmd, [...args], {
        env: {...process.env, ...opts.env},
        stdio: [opts.stdin === undefined ? "ignore" : "pipe", stdout ? stdout.fd : "pipe", "pipe"],
      });
      let output = "";
      child.stdout?.on("data", (b) => {
        output += b.toString();
      });
      let stderr = "";
      child.stderr?.on("data", (b) => {
        stderr += b.toString();
      });
      // The child may exit before reading everything; its exit code tells what happened.
      child.stdin?.on("error", () => undefined);
      child.stdin?.end(opts.stdin);
      // A child that outlives this process would go on with its work under whatever runs next.
      const kill = () => child.kill();
      process.once("exit", kill);
      child.on("error", (e) => {
        process.off("exit", kill);
        reject(e);
      });
      child.on("close", (code) => {
        process.off("exit", kill);
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`${cmd} exited with code ${code}: ${stderr.trim() || output.trim().slice(-1000)}`));
        }
      });
    });
  } finally {
    await stdout?.close();
  }
}
