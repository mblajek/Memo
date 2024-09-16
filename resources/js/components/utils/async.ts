import {getOwner, runWithOwner} from "solid-js";

export type PossiblyAsyncIterable<T> = AsyncIterable<T> | Iterable<T>;

export type OrPromise<T> = T | Promise<T>;

/**
 * Equivalent of `Promise.resolve(value).then(func)`, but if value is not a promise,
 * calls func immediately. Runs the function with the current owner.
 */
export function then<T, R>(value: OrPromise<T>, func: (value: T) => R): OrPromise<R> {
  if (value instanceof Promise) {
    const owner = getOwner();
    return value.then((value) => runWithOwner(owner, () => func(value))!);
  }
  return func(value);
}
