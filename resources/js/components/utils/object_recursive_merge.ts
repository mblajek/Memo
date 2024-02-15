export function objectRecursiveMerge<T>(...objects: (Partial<T> | undefined)[]): T {
  const objs = objects as (Partial<Record<string, unknown>> | undefined)[];
  const result = Object.assign({}, ...objs);
  for (const [key, value] of Object.entries(result)) {
    if (isObject(value) || (value == undefined && objs.some((o) => isObject(o) && isObject(o[key])))) {
      result[key] = objectRecursiveMerge(
        ...(objs.map((o) => (o === undefined ? undefined : o[key])) as [
          // It might be impossible to express the types here correctly.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          any,
        ]),
      );
    }
  }
  return result;
}

function isObject(o: unknown): o is object {
  return o !== null && typeof o === "object" && !Array.isArray(o);
}
