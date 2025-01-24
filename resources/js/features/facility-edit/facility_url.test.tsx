import {getUrlSuggestion} from "features/facility-edit/facility_url";
import {expect, test} from "vitest";

test("url suggestions", () => {
  expect(getUrlSuggestion("")).toBe("");
  expect(getUrlSuggestion(" ")).toBe("");
  expect(getUrlSuggestion("My Facility")).toBe("my-facility");
  expect(getUrlSuggestion(" My  Facility ")).toBe("my-facility");
  expect(getUrlSuggestion("- My - Facility -")).toBe("my-facility");
  expect(getUrlSuggestion(" Żółć Gdańsk ąęćłńóśźż AĘĆŁŃÓŚŹŻ ")).toBe("zolc-gdansk-aeclnoszz-aeclnoszz");
  expect(getUrlSuggestion(" !@# 💥 test 💥 $%^ ")).toBe("test");
});
