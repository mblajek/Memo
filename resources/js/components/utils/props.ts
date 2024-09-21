/** Checks whether the props object has the given prop, with or without value. */
export function hasProp<P extends object>(props: P, key: keyof P) {
  return key in props && Object.hasOwn(props, key);
}
