import {expect, test} from "vitest";
import {trimInput} from "./util";

test("trimInput", () => {
  expect(trimInput("")).toBe("");
  expect(trimInput("abc")).toBe("abc");
  expect(trimInput("  abc  ")).toBe("abc");
  expect(trimInput(" text   with extra  spaces ")).toBe("text with extra spaces");
});
