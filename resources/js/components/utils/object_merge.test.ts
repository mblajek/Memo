import {describe, expect, test} from "vitest";
import {objectRecursiveMerge} from "./object_merge";

interface T {
  a: number;
  b: string;
  c: {x?: number; y?: {k?: string}};
  d: string[];
}

describe("objectRecursiveMerge", () => {
  test("basic", () => {
    expect(objectRecursiveMerge<T>({c: undefined})).toEqual({c: undefined});
    expect(objectRecursiveMerge<T>({c: {x: undefined}})).toEqual({c: {x: undefined}});
    expect(objectRecursiveMerge<T>({a: 0, b: "b"}, {b: "", c: {x: 6}}, {c: {x: 0}})).toEqual({a: 0, b: "", c: {x: 0}});
    expect(objectRecursiveMerge<T>({c: {x: 6}}, {c: undefined}, {c: {y: undefined}})).toEqual({c: {x: 6}});
    expect(objectRecursiveMerge<T>({c: {}}, {c: undefined}, {c: {y: undefined}})).toEqual({c: {}});
    expect(objectRecursiveMerge<T>({c: undefined}, {c: undefined})).toEqual({c: undefined});
    expect(objectRecursiveMerge<T>({c: {y: {k: "k"}}}, {c: {}}, {c: {y: {}}})).toEqual({c: {y: {k: "k"}}});
  });

  test("array", () => {
    expect(objectRecursiveMerge<T>({d: ["a", "b"]}, {d: ["c"]}, {d: ["d", "e"]})).toEqual({d: ["d", "e"]});
    expect(objectRecursiveMerge<T>({d: ["a", "b"]}, {d: undefined})).toEqual({d: undefined});
    expect(objectRecursiveMerge<T>({d: undefined}, {d: ["a", "b"]})).toEqual({d: ["a", "b"]});
  });
});
