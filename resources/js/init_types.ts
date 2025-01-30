export {};

declare global {
  interface ArrayConstructor {
    // Improve type inference for Array.isArray on readonly arrays.
    isArray<T>(arg: ReadonlyArray<T> | unknown): arg is ReadonlyArray<T>;
  }

  // The mobile Chrome browser on iPhone and iPad don't support the iterator helper methods. Try to
  // add some support for the browser by disabling the helper methods.
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Iterator
  // TODO: Remove when the helper methods are supported in Safari on iOS (probably).
  // https://caniuse.com/mdn-javascript_builtins_iterator_filter

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ArrayIterator<T> {
    every: never;
    filter: never;
    find: never;
    flatMap: never;
    forEach: never;
    map: never;
    reduce: never;
    some: never;
    drop: never;
    take: never;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface StringIterator<T> {
    every: never;
    filter: never;
    find: never;
    flatMap: never;
    forEach: never;
    map: never;
    reduce: never;
    some: never;
    drop: never;
    take: never;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface MapIterator<T> {
    every: never;
    filter: never;
    find: never;
    flatMap: never;
    forEach: never;
    map: never;
    reduce: never;
    some: never;
    drop: never;
    take: never;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface SetIterator<T> {
    every: never;
    filter: never;
    find: never;
    flatMap: never;
    forEach: never;
    map: never;
    reduce: never;
    some: never;
    drop: never;
    take: never;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface RegExpStringIterator<T> {
    every: never;
    filter: never;
    find: never;
    flatMap: never;
    forEach: never;
    map: never;
    reduce: never;
    some: never;
    drop: never;
    take: never;
  }
  interface Generator {
    every: never;
    filter: never;
    find: never;
    flatMap: never;
    forEach: never;
    map: never;
    reduce: never;
    some: never;
    drop: never;
    take: never;
  }
}
