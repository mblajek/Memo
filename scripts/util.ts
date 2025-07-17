export async function run(command: string, ...args: string[]) {
  console.debug("Running: ", [command, ...args].map((e) => JSON.stringify(e)).join(" "));
  const res = await new Deno.Command(command, {args}).output();
  if (!res.success) {
    throw new Error(`Failure:\n${new TextDecoder().decode(res.stderr)}`);
  }
  return new TextDecoder().decode(res.stdout);
}

export function confirmContinue(message: string) {
  if (!confirm(message)) {
    Deno.exit(1);
  }
}
