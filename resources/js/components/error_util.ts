export function getFullErrorMessage(error: Error | unknown, depth = 0): string {
  if (depth > 10) {
    return "(clipped)";
  }
  if (error instanceof Error) {
    const header = String(error);
    const stack = error.stack;
    // On some browsers stack includes the header line, on others it doesn't.
    const result = stack ? (stack.startsWith(header) ? stack : `${header}\n${stack}`) : header;
    return error.cause ? `${result}\nCaused by:\n${getFullErrorMessage(error.cause, depth + 1)}` : result;
  }
  return String(error).trim();
}
