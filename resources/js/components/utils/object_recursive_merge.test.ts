import {expect, test} from "vitest";
import {objectRecursiveMerge} from "./object_recursive_merge";

interface T {
  a: number;
  b: string;
  c: {x?: number; y?: {k?: string}};
}

test("objectRecursiveMerge", () => {
  expect(objectRecursiveMerge<T>({a: 0, b: "b"}, {b: "", c: {x: 6}}, {c: {x: 0}})).toEqual({a: 0, b: "", c: {x: 0}});
  expect(objectRecursiveMerge<T>({c: {x: 6}}, {c: undefined}, {c: {y: undefined}})).toEqual({c: {x: 6}});
  expect(objectRecursiveMerge<T>({c: {}}, {c: undefined}, {c: {y: undefined}})).toEqual({c: {}});
  expect(objectRecursiveMerge<T>({c: undefined}, {c: undefined})).toEqual({c: undefined});
  expect(objectRecursiveMerge<T>({c: {y: {k: "k"}}}, {c: {}}, {c: {y: {}}})).toEqual({c: {y: {k: "k"}}});
});
