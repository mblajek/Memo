export function objectRecursiveMerge<T>(...objects: (Partial<T> | undefined)[]): T {
  const objs = objects as (Partial<Record<string, unknown>> | undefined)[];
  const result = Object.assign({}, ...objs);
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === "object" || (value == undefined && objs.some((o) => o && typeof o[key] === "object")))
      result[key] = objectRecursiveMerge(
        ...(objs.map((o) => (o === undefined ? undefined : o[key])) as [
          // It might be impossible to express the types here correctly.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          any,
        ]),
      );
  }
  return result;
}
