export async function run(
  command: readonly string[],
  options: Deno.CommandOptions & {stdout: "inherit"},
): Promise<void>;
export async function run(command: readonly string[], options?: Deno.CommandOptions): Promise<string>;
export async function run(command: readonly string[], options?: Deno.CommandOptions): Promise<string | void> {
  console.debug("Running: ", command.map((e) => JSON.stringify(e)).join(" "));
  const res = await new Deno.Command(command[0], {
    args: command.slice(1),
    ...options,
  }).output();
  function readOut(out: "stdout" | "stderr") {
    return options?.[out] === "inherit" || options?.[out] === "null" ? undefined : new TextDecoder().decode(res[out]);
  }
  if (!res.success) {
    const err = readOut("stderr");
    throw new Error(err ? `Failure:\n${err}` : "Failure");
  }
  return readOut("stdout");
}

export function confirmContinue(message: string) {
  if (!confirm(message)) {
    Deno.exit(1);
  }
}
