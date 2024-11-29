import {DEV} from "solid-js";

export {};

declare global {
  interface ArrayConstructor {
    // Improve type inference for Array.isArray on readonly arrays.
    isArray<T>(arg: ReadonlyArray<T> | unknown): arg is ReadonlyArray<T>;
  }
}

// Install polyfills for Iterator methods which are not supported in Safari.
// Safari is not an officially supported browser, but it seems to be easy to stop it from failing with this change.
// https://caniuse.com/mdn-javascript_builtins_iterator_filter
// TODO: Remove when all major browsers support these methods.

/* eslint-disable @typescript-eslint/no-explicit-any */

function installIteratorMethod(func: keyof Array<unknown>, returnsIterator = false) {
  if (DEV || !(Iterator.prototype as any)[func]) {
    (Iterator.prototype as any)[func] = function (this: Array<any>, ...params: any[]) {
      const arr = [...this];
      const val = (arr[func] as any).apply(arr, params);
      return returnsIterator ? val[Symbol.iterator]() : val;
    } as any;
  }
}

installIteratorMethod("filter", true);
installIteratorMethod("map", true);
installIteratorMethod("flatMap", true);
installIteratorMethod("forEach");
installIteratorMethod("some");
installIteratorMethod("every");
installIteratorMethod("find");
installIteratorMethod("reduce");
