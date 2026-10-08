/**
 * A JSON-serializable value — strings, numbers, booleans, null, arrays, and plain objects with
 * string keys. Includes `undefined` for ergonomics so optional fields fit the type; note that
 * `JSON.stringify` drops keys whose value is `undefined`, so a round-trip will not preserve them.
 *
 * Declare the types of such values as `type X = {...}` rather than `interface X {...}`. TypeScript only
 * structurally checks closed type aliases against the recursive index-signature case; interfaces,
 * being declaration-merge targets, are conservatively rejected.
 */
export type JSONValue =
  string | number | boolean | null | undefined | readonly JSONValue[] | {readonly [key: string]: JSONValue | undefined};
