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

export function skipUndefinedValues<T extends object>(object: T) {
  const result: Partial<Record<string, unknown>> = {};
  for (const [key, value] of Object.entries(object)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Converts recursively an object that might contain getters or be a Proxy to a plain object with the same data.
 */
export function toPlainObject<T>(object: T): T;
/**
 * Converts recursively an object that might contain getters or be a Proxy to a plain object with the same data.
 * Only the specified keys in the top level object are present in the result.
 */
export function toPlainObject<T extends object, K extends keyof T & string>(object: T, keys: K[]): Pick<T, K>;
export function toPlainObject<T extends object>(object: T, keys?: (keyof T & string)[]): T {
  if (object == undefined) {
    return object;
  } else if (Array.isArray(object)) {
    return object.map((o) => toPlainObject(o)) as T;
  }
  if (typeof object === "object") {
    const res = {} as Partial<Record<string, unknown>>;
    for (const key of keys || Object.keys(object)) {
      res[key] = toPlainObject(object[key as keyof T]);
    }
    return res as T;
  } else {
    return object;
  }
}
