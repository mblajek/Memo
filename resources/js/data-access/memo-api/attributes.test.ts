import {NO_FACILITY} from "state/activeFacilityId.state";
import {describe, expect, test} from "vitest";
import {Attributes} from "./attributes";
import {Dictionaries} from "./dictionaries";

describe("Attributes", () => {
  const langFunc = (key: string) => `t(${key})`;
  const dictionaries = Dictionaries.fromResources(langFunc, [
    {
      id: "dd",
      name: "dd",
      facilityId: null,
      positions: [
        {
          id: "dd1",
          name: "dd1",
          dictionaryId: "dd",
          facilityId: "fac1",
          isDisabled: false,
          isFixed: false,
          defaultOrder: 0,
        },
        {
          id: "dd2",
          name: "dd2",
          dictionaryId: "dd",
          facilityId: null,
          isDisabled: false,
          isFixed: false,
          defaultOrder: 1,
        },
      ],
      isFixed: false,
      isExtendable: true,
    },
  ]);
  const attributes = Attributes.fromResources(
    (key) => `t(${key})`,
    [
      {
        id: "aa1",
        facilityId: null,
        table: "blips",
        model: "blip",
        name: "aa1",
        apiName: "aa1",
        type: "dict",
        dictionaryId: "dd",
        defaultOrder: 1,
        isMultiValue: false,
        requirementLevel: "required",
      },
      {
        id: "aa2",
        facilityId: "fac2",
        table: "blips",
        model: "blip",
        name: "+aa2",
        apiName: "aa2",
        type: "string",
        dictionaryId: null,
        defaultOrder: 2,
        isMultiValue: true,
        requirementLevel: "recommended",
      },
    ],
    dictionaries,
  );

  test("labels", () => {
    expect(attributes.byId.get("aa1")?.label).toEqual("t(models.blip.aa1)");
    expect(attributes.byId.get("aa2")?.label).toEqual("aa2");
  });

  test("get", () => {
    expect(attributes.get("aa1")).toBeDefined();
    expect(attributes.get("aa2")).toBeDefined();
    expect(() => attributes.get("aa3")).toThrow("not found");
  });

  test("getForModel", () => {
    expect(attributes.getForModel("blip").map((a) => a.id)).toEqual(["aa1", "aa2"]);
    expect(attributes.getForModel("blap")).toEqual([]);
  });

  test("dictionary", () => {
    expect(attributes.get("aa1").dictionary?.id).toEqual("dd");
    expect(attributes.get("aa2").dictionary).toBeUndefined();
  });

  test("subsetFor global", () => {
    const globalAttributes = attributes.subsetFor(NO_FACILITY);
    expect(globalAttributes.byId.get("aa1")).toBeDefined();
    expect(globalAttributes.byId.get("aa1")?.dictionary?.allPositions.map((p) => p.id)).toEqual(["dd2"]);
    expect(globalAttributes.byId.get("aa2")).toBeUndefined();
  });

  test("subsetFor facility", () => {
    const fac1Attributes = attributes.subsetFor("fac1");
    expect(fac1Attributes.byId.get("aa1")).toBeDefined();
    expect(fac1Attributes.byId.get("aa1")?.dictionary?.allPositions.map((p) => p.id)).toEqual(["dd1", "dd2"]);
    expect(fac1Attributes.byId.get("aa2")).toBeUndefined();
    expect(fac1Attributes.byModel.get("blip")?.map((a) => a.id)).toEqual(["aa1"]);
    const fac2Attributes = attributes.subsetFor("fac2");
    expect(fac2Attributes.byId.get("aa1")).toBeDefined();
    expect(fac2Attributes.byId.get("aa1")?.dictionary?.allPositions.map((p) => p.id)).toEqual(["dd2"]);
    expect(fac2Attributes.byId.get("aa2")).toBeDefined();
    expect(fac2Attributes.byModel.get("blip")?.map((a) => a.id)).toEqual(["aa1", "aa2"]);
    const fac3Attributes = attributes.subsetFor("fac3");
    expect(fac3Attributes.byId.get("aa1")).toBeDefined();
    expect(fac3Attributes.byId.get("aa1")?.dictionary?.allPositions.map((p) => p.id)).toEqual(["dd2"]);
    expect(fac3Attributes.byId.get("aa2")).toBeUndefined();
  });
});
