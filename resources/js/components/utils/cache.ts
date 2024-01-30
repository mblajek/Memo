import {Accessor} from "solid-js";

export function createCached<T, R>(creator: Accessor<T>, transform: (t: T) => R): Accessor<R>;
/**
 * Creates a cached state. A typical use case is caching a memo which depends on a query. Without caching,
 * the query would be subscribed to multiple times, possibly hundreds of times if used in a small component,
 * and TanStack Query cache performance will affect the page performance.
 */
export function createCached<T>(creator: Accessor<T>): Accessor<T>;
export function createCached<T, R>(creator: Accessor<T>, transform = (t: T) => t as unknown as R) {
  let data: T | undefined;
  return () => {
    if (data === undefined) {
      data = creator();
    }
    return transform(data);
  };
}
