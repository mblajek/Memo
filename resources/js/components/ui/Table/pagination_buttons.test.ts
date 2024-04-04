import {expect, test} from "vitest";
import {getPaginationButtonsList} from "./pagination_buttons";

function pagination(params: {numPages: number; numSiblings: number}) {
  return (pageIndex: number) => getPaginationButtonsList({...params, pageIndex}).map((p) => (p === "..." ? p : p + 1));
}

test("getPaginationButtonsList", () => {
  const pag7_3 = pagination({numPages: 7, numSiblings: 3});
  expect(pag7_3(0)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(pag7_3(3)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(pag7_3(6)).toEqual([1, 2, 3, 4, 5, 6, 7]);

  const pag7_1 = pagination({numPages: 7, numSiblings: 1});
  expect(pag7_1(0)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(pag7_1(3)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(pag7_1(6)).toEqual([1, 2, 3, 4, 5, 6, 7]);

  const pag8_1 = pagination({numPages: 8, numSiblings: 1});
  expect(pag8_1(0)).toEqual([1, 2, 3, 4, 5, "...", 8]);
  expect(pag8_1(3)).toEqual([1, 2, 3, 4, 5, "...", 8]);
  expect(pag8_1(4)).toEqual([1, "...", 4, 5, 6, 7, 8]);
  expect(pag8_1(7)).toEqual([1, "...", 4, 5, 6, 7, 8]);

  const pag12_2 = pagination({numPages: 12, numSiblings: 2});
  expect(pag12_2(0)).toEqual([1, 2, 3, 4, 5, 6, 7, "...", 12]);
  expect(pag12_2(4)).toEqual([1, 2, 3, 4, 5, 6, 7, "...", 12]);
  expect(pag12_2(5)).toEqual([1, "...", 4, 5, 6, 7, 8, "...", 12]);
  expect(pag12_2(6)).toEqual([1, "...", 5, 6, 7, 8, 9, "...", 12]);
  expect(pag12_2(7)).toEqual([1, "...", 6, 7, 8, 9, 10, 11, 12]);
  expect(pag12_2(11)).toEqual([1, "...", 6, 7, 8, 9, 10, 11, 12]);
});
