declare global {
  interface ArrayConstructor {
    isArray<T>(arg: ReadonlyArray<T> | unknown): arg is ReadonlyArray<T>;
  }
}
