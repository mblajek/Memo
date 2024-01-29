import {Accessor} from "solid-js";

export function createCached<T, Args extends unknown[], R>(
  creator: Accessor<T>,
  transform: (t: T, ...args: Args) => R,
): Accessor<R>;
export function createCached<T>(creator: Accessor<T>): Accessor<T>;
export function createCached<T, Args extends unknown[], R>(
  creator: Accessor<T>,
  transform = (t: T, ..._args: Args) => t as unknown as R,
) {
  let data: T | undefined;
  return (...args: Args) => {
    if (!data) {
      data = creator();
    }
    return transform(data, ...args);
  };
}
