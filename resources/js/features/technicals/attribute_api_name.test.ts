import {apiNameMatchesName, getApiNameBase, getApiNameSuggestion} from "features/technicals/attribute_api_name";
import {expect, test} from "vitest";

test("api name base", () => {
  expect(getApiNameBase("")).toBe("");
  expect(getApiNameBase(" ")).toBe("");
  expect(getApiNameBase(" Data  zgłoszenia ")).toBe("dataZgloszenia");
  expect(getApiNameBase("Żółć Gdańsk ąęćłńóśźż")).toBe("zolcGdanskAeclnoszz");
  expect(getApiNameBase("wiek (w momencie zgłoszenia)")).toBe("wiekWMomencieZgloszenia");
  expect(getApiNameBase("2b or not 2b")).toBe("2bOrNot2b");
});

test("api name matching", () => {
  expect(apiNameMatchesName("", "")).toBe(true);
  expect(apiNameMatchesName("custom", "")).toBe(false);
  expect(apiNameMatchesName("dataZgloszeniaU1d6d5712", "Data zgłoszenia")).toBe(true);
  expect(apiNameMatchesName("dataZgloszeniaU1d", "Data zgłoszenia")).toBe(true);
  expect(apiNameMatchesName("dataZgloszeniaU", "Data zgłoszenia")).toBe(true);
  expect(apiNameMatchesName("dataZgloszenia", "Data zgłoszenia")).toBe(false);
  expect(apiNameMatchesName("customName", "Data zgłoszenia")).toBe(false);
});

test("api name suggestion", () => {
  expect(getApiNameSuggestion("", "dataZgloszeniaU1d6d5712")).toBe("");
  expect(getApiNameSuggestion("Nowa nazwa", "dataZgloszeniaU1d6d5712")).toBe("nowaNazwaU1d6d5712");
  expect(getApiNameSuggestion("Nowa nazwa", "")).toMatch(/^nowaNazwaU[0-9a-f]{8}$/);
});
