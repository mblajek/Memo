import {NO_FACILITY} from "state/activeFacilityId.state";
import {describe, expect, test} from "vitest";
import {makeAttributable} from "./attributable";
import {Attributes} from "./attributes";
import {Dictionaries} from "./dictionaries";

describe("Attributes", () => {
  const langFunc = (key: unknown) => `t(${key})`;
  const dictionaries = Dictionaries.fromResources(langFunc, [
    {
      id: "dd",
      name: "dict1-global",
      facilityId: null,
      positions: [],
      isFixed: false,
      isExtendable: false,
    },
  ]);
  const attributes = Attributes.fromResources(langFunc, dictionaries, [
    {
      id: "aa1Id",
      facilityId: null,
      model: "blip",
      name: "aa1_attr",
      apiName: "aa1ApiName",
      type: "dict",
      typeModel: null,
      dictionaryId: "dd",
      isFixed: true,
      defaultOrder: 1,
      isMultiValue: false,
      requirementLevel: "required",
    },
    {
      id: "aa2Id",
      facilityId: "fac2",
      model: "blip",
      name: "+aa2 attr",
      apiName: "aa2ApiName",
      type: "string",
      typeModel: null,
      dictionaryId: null,
      isFixed: false,
      defaultOrder: 2,
      isMultiValue: true,
      requirementLevel: "recommended",
    },
    {
      id: "aa5Id",
      facilityId: null,
      model: "qqq",
      name: "aa5_attr",
      apiName: "aa5ApiName",
      type: "int",
      typeModel: null,
      dictionaryId: null,
      isFixed: false,
      defaultOrder: 3,
      isMultiValue: false,
      requirementLevel: "optional",
    },
  ]);

  test("labels", () => {
    expect(attributes.byId.get("aa1Id")?.label).toEqual(
      "t(attributes.attributes.blip.aa1_attr,attributes.attributes.generic.aa1_attr,models.blip.aa1ApiName,models.generic.aa1ApiName,dictionary.dict1-global._name)",
    );
    expect(attributes.byId.get("aa2Id")?.label).toEqual("aa2 attr");
  });

  test("get", () => {
    expect(attributes.getById("aa1Id")).toBeDefined();
    expect(attributes.getById("aa2Id")).toBeDefined();
    expect(() => attributes.getById("aa3Id")).toThrow("not found");
    expect(attributes.getByName("blip", "aa1ApiName")).toBeDefined();
    expect(() => attributes.getByName("blip", "aa3ApiName")).toThrow("not found");
  });

  test("getForModel", () => {
    expect(attributes.getForModel("blip").map((a) => a.id)).toEqual(["aa1Id", "aa2Id"]);
    expect(attributes.getForModel("blap")).toEqual([]);
  });

  test("subsetFor global", () => {
    const globalAttributes = attributes.subsetFor(NO_FACILITY);
    expect(globalAttributes.byId.get("aa1Id")).toBeDefined();
    expect(globalAttributes.byId.get("aa2Id")).toBeUndefined();
  });

  test("subsetFor facility", () => {
    const fac1Attributes = attributes.subsetFor("fac1");
    expect(fac1Attributes.byId.get("aa1Id")).toBeDefined();
    expect(fac1Attributes.byId.get("aa2Id")).toBeUndefined();
    expect(fac1Attributes.getForModel("blip").map((a) => a.id)).toEqual(["aa1Id"]);
    const fac2Attributes = attributes.subsetFor("fac2");
    expect(fac2Attributes.byId.get("aa1Id")).toBeDefined();
    expect(fac2Attributes.byId.get("aa2Id")).toBeDefined();
    expect(fac2Attributes.getForModel("blip").map((a) => a.id)).toEqual(["aa1Id", "aa2Id"]);
    const fac3Attributes = attributes.subsetFor("fac3");
    expect(fac3Attributes.byId.get("aa1Id")).toBeDefined();
    expect(fac3Attributes.byId.get("aa2Id")).toBeUndefined();
  });

  test("readAll", () => {
    const blip = makeAttributable({id: "blip1", aa1ApiName: "dd1", aa2ApiName: ["aa2"]}, "blip");
    expect(attributes.readAll(blip)).toEqual([
      {model: "blip", attribute: attributes.getById("aa1Id"), value: "dd1"},
      {model: "blip", attribute: attributes.getById("aa2Id"), value: ["aa2"]},
    ]);
    expect(attributes.subsetFor("fac1").readAll(blip)).toEqual([
      {model: "blip", attribute: attributes.getById("aa1Id"), value: "dd1"},
    ]);
    const blap = makeAttributable({id: "blap1", aa1: "dd1", aa2: ["aa2"]}, "blap");
    expect(attributes.readAll(blap)).toEqual([]);
  });

  test("read from another model", () => {
    const blap = makeAttributable({id: "blap1", aa1: "dd1", aa2: ["aa2"]}, "blap");
    expect(() => attributes.read(blap, "aa1Id")).toThrow(
      "read attribute aa1ApiName for model blip from an object representing models blap",
    );
  });
});
