import {expect, test} from "vitest";
import {objectMerge} from "./object_merge";

interface T {
  a: number;
  b: string;
  c: {x?: number; y?: {k?: string}};
}

test("objectMerge", () => {
  expect(objectMerge<T>({a: 0, b: "b"}, {b: "", c: {x: 6}}, {c: {x: 0}})).toEqual({a: 0, b: "", c: {x: 0}});
  expect(objectMerge<T>({c: {x: 6}}, {c: undefined}, {c: {y: undefined}})).toEqual({c: {x: 6}});
  expect(objectMerge<T>({c: {}}, {c: undefined}, {c: {y: undefined}})).toEqual({c: {}});
  expect(objectMerge<T>({c: undefined}, {c: undefined})).toEqual({c: undefined});
  expect(objectMerge<T>({c: {y: {k: "k"}}}, {c: {}}, {c: {y: {}}})).toEqual({c: {y: {k: "k"}}});
});
