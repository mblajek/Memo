import {expect, test} from "vitest";
import {getUrlSuggestion} from "./FacilityCreateForm";

test("url suggestions", () => {
  expect(getUrlSuggestion("")).toBe("");
  expect(getUrlSuggestion(" ")).toBe("");
  expect(getUrlSuggestion("My Facility")).toBe("my-facility");
  expect(getUrlSuggestion(" My  Facility ")).toBe("my-facility");
  expect(getUrlSuggestion("- My - Facility -")).toBe("my-facility");
  expect(getUrlSuggestion(" Żółć Gdańsk ąęćłńóśźż AĘĆŁŃÓŚŹŻ ")).toBe("zolc-gdansk-aeclnoszz-aeclnoszz");
  expect(getUrlSuggestion(" !@# 💥 test 💥 $%^ ")).toBe("test");
});
