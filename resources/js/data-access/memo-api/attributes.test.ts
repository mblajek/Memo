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
      id: "aa1",
      facilityId: null,
      model: "blip",
      name: "aa1_attr",
      apiName: "aa1",
      type: "dict",
      typeModel: null,
      dictionaryId: "dd",
      isFixed: true,
      defaultOrder: 1,
      isMultiValue: false,
      requirementLevel: "required",
    },
    {
      id: "aa2",
      facilityId: "fac2",
      model: "blip",
      name: "+aa2 attr",
      apiName: "aa2",
      type: "string",
      typeModel: null,
      dictionaryId: null,
      isFixed: false,
      defaultOrder: 2,
      isMultiValue: true,
      requirementLevel: "recommended",
    },
    {
      id: "aa5",
      facilityId: null,
      model: "qqq",
      name: "aa5_attr",
      apiName: "aa5",
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
    expect(attributes.byId.get("aa1")?.label).toEqual("t(attributes.blip.aa1_attr,models.blip.aa1)");
    expect(attributes.byId.get("aa2")?.label).toEqual("aa2 attr");
  });

  test("get", () => {
    expect(attributes.get("aa1")).toBeDefined();
    expect(attributes.get("aa2")).toBeDefined();
    expect(() => attributes.get("aa3")).toThrow("not found");
    expect(attributes.get("aa1_attr")).toBeDefined();
    expect(() => attributes.get("+aa2 attr")).toThrow("not found");
    expect(() => attributes.get("aa5_attr")).toThrow("not found"); // not fixed
  });

  test("getForModel", () => {
    expect(attributes.getForModel("blip").map((a) => a.id)).toEqual(["aa1", "aa2"]);
    expect(attributes.getForModel("blap")).toEqual([]);
  });

  test("subsetFor global", () => {
    const globalAttributes = attributes.subsetFor(NO_FACILITY);
    expect(globalAttributes.byId.get("aa1")).toBeDefined();
    expect(globalAttributes.byId.get("aa2")).toBeUndefined();
  });

  test("subsetFor facility", () => {
    const fac1Attributes = attributes.subsetFor("fac1");
    expect(fac1Attributes.byId.get("aa1")).toBeDefined();
    expect(fac1Attributes.byId.get("aa2")).toBeUndefined();
    expect(fac1Attributes.byModel.get("blip")?.map((a) => a.id)).toEqual(["aa1"]);
    const fac2Attributes = attributes.subsetFor("fac2");
    expect(fac2Attributes.byId.get("aa1")).toBeDefined();
    expect(fac2Attributes.byId.get("aa2")).toBeDefined();
    expect(fac2Attributes.byModel.get("blip")?.map((a) => a.id)).toEqual(["aa1", "aa2"]);
    const fac3Attributes = attributes.subsetFor("fac3");
    expect(fac3Attributes.byId.get("aa1")).toBeDefined();
    expect(fac3Attributes.byId.get("aa2")).toBeUndefined();
  });

  test("readAll", () => {
    const blip = makeAttributable({id: "blip1", aa1: "dd1", aa2: ["aa2"]}, "blip");
    expect(attributes.readAll(blip)).toEqual([
      {model: "blip", attribute: attributes.get("aa1"), value: "dd1"},
      {model: "blip", attribute: attributes.get("aa2"), value: ["aa2"]},
    ]);
    expect(attributes.subsetFor("fac1").readAll(blip)).toEqual([
      {model: "blip", attribute: attributes.get("aa1"), value: "dd1"},
    ]);
    const blap = makeAttributable({id: "blap1", aa1: "dd1", aa2: ["aa2"]}, "blap");
    expect(attributes.readAll(blap)).toEqual([]);
  });

  test("read from another model", () => {
    const blap = makeAttributable({id: "blap1", aa1: "dd1", aa2: ["aa2"]}, "blap");
    expect(() => attributes.read(blap, "aa1")).toThrow(
      "read attribute aa1 for model blip from an object representing models blap",
    );
  });
});
