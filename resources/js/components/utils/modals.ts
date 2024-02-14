import {GlobalPageElementArgs} from "./GlobalPageElements";

/**
 * Utility helping with defining a modal as a global page element. Returns a function that forwards the
 * call to func, and also clears params in args, which is suitable for onSuccess etc handlers that also
 * close the modal.
 */
export function doAndClearParams<T, A extends unknown[], R>(
  args: GlobalPageElementArgs<T>,
  func: ((...funcArgs: A) => R) | undefined,
) {
  return (...funcArgs: A) => {
    try {
      return func?.(...funcArgs);
    } finally {
      args.clearParams();
    }
  };
}
