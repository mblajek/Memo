import {describe, expect, test} from "vitest";
import {trimInput} from "./util";

describe("trimInput", () => {
  test("one line string", () => {
    expect(trimInput("")).toEqual("");
    expect(trimInput("abc")).toEqual("abc");
    expect(trimInput("  abc  ")).toEqual("abc");
    expect(trimInput(" text   with extra  spaces ")).toEqual("text with extra spaces");
  });

  test("multi-line string", () => {
    expect(trimInput("  \n  \n  ")).toEqual("");
    expect(trimInput("a  \nb  ")).toEqual("a\nb");
    expect(trimInput("  a  \n \nb  \n\n  \nc")).toEqual("a\n\nb\n\n\nc");
    expect(trimInput("abc  \n  def  \n  ghi ")).toEqual("abc\n  def\n  ghi");
  });
});
