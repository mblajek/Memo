import {LangFunc} from "components/utils/lang";
import {NO_FACILITY} from "state/activeFacilityId.state";
import {describe, expect, test} from "vitest";
import {Dictionaries} from "./dictionaries";

describe("Dictionaries", () => {
  const dictionaries = Dictionaries.fromResources(((key) => `t(${key as string})`) as LangFunc, [
    {
      id: "d1",
      name: "dict1-global",
      facilityId: null,
      positions: [
        {
          id: "d1p1",
          name: "dict1item1",
          dictionaryId: "d1",
          facilityId: null,
          isDisabled: false,
          isFixed: true,
          defaultOrder: 0,
          positionGroupDictId: null,
        },
        {
          id: "d1p2",
          name: "dict1item2",
          dictionaryId: "d1",
          facilityId: null,
          isDisabled: true,
          isFixed: false,
          defaultOrder: 1,
          positionGroupDictId: null,
        },
        {
          id: "d1p3",
          name: "+dict1item3",
          dictionaryId: "d1",
          facilityId: null,
          isDisabled: false,
          isFixed: false,
          defaultOrder: 2,
          positionGroupDictId: null,
        },
      ],
      isFixed: true,
      isExtendable: true,
    },
    {
      id: "d2",
      name: "dict2-fac1",
      facilityId: "fac1",
      positions: [
        {
          id: "d2p1",
          name: "dict2item1",
          dictionaryId: "d2",
          facilityId: "fac1",
          isDisabled: false,
          isFixed: false,
          defaultOrder: 0,
          positionGroupDictId: null,
        },
        {
          id: "d2p2",
          name: "dict2item2",
          dictionaryId: "d2",
          facilityId: "fac1",
          isDisabled: true,
          isFixed: false,
          defaultOrder: 1,
          positionGroupDictId: null,
        },
        {
          id: "d2p3",
          name: "+dict2item3",
          dictionaryId: "d2",
          facilityId: "fac1",
          isDisabled: false,
          isFixed: false,
          defaultOrder: 2,
          positionGroupDictId: null,
        },
      ],
      isFixed: false,
      isExtendable: true,
    },
    {
      id: "d3",
      name: "+dict3-mixed",
      facilityId: null,
      positions: [
        {
          id: "d3p1",
          name: "+dict3item1",
          dictionaryId: "d3",
          facilityId: null,
          isDisabled: false,
          isFixed: false,
          defaultOrder: 0,
          positionGroupDictId: null,
        },
        {
          id: "d3p2",
          name: "+dict3item2",
          dictionaryId: "d3",
          facilityId: "fac1",
          isDisabled: true,
          isFixed: false,
          defaultOrder: 1,
          positionGroupDictId: null,
        },
        {
          id: "d3p3",
          name: "+dict3item3",
          dictionaryId: "d3",
          facilityId: "fac2",
          isDisabled: false,
          isFixed: false,
          defaultOrder: 2,
          positionGroupDictId: null,
        },
      ],
      isFixed: false,
      isExtendable: true,
    },
  ]);

  function dictsToIds(dicts: Dictionaries) {
    return Array.from(dicts, (d) => ({
      label: d.id,
      allPositions: d.allPositions.map((p) => p.id),
    }));
  }

  function dictsToLabels(dicts: Dictionaries) {
    return Array.from(dicts, (d) => ({
      label: d.label,
      allPositions: d.allPositions.map((p) => p.label),
    }));
  }

  test("labels", () => {
    expect(dictsToLabels(dictionaries)).toEqual([
      {
        label: "t(dictionary.dict1-global._name)",
        allPositions: ["t(dictionary.dict1-global.dict1item1)", "t(???.dict1-global.dict1item2)", "dict1item3"],
      },
      {
        label: "t(dictionary.dict2-fac1._name)",
        allPositions: ["t(???.dict2-fac1.dict2item1)", "t(???.dict2-fac1.dict2item2)", "dict2item3"],
      },
      {
        label: "dict3-mixed",
        allPositions: ["dict3item1", "dict3item2", "dict3item3"],
      },
    ]);
  });

  test("get", () => {
    expect(dictionaries.get("d1")?.id).toEqual("d1");
    expect(dictionaries.get("d3")?.id).toEqual("d3");
    expect(() => dictionaries.get("d5")).toThrow("not found");
    expect(dictionaries.get("dict1-global")?.id).toEqual("d1");
    expect(() => dictionaries.get("dict2-fac1")).toThrow("not found");
    expect(() => dictionaries.get("+dict2-fac1")).toThrow("not found");
  });

  test("dictionary.get", () => {
    expect(dictionaries.get("d1")?.get("d1p1").id).toEqual("d1p1");
    expect(dictionaries.get("d1")?.get("dict1item1").id).toEqual("d1p1");
    expect(() => dictionaries.get("d1")?.get("dict1item2").id).toThrow("not found"); // not fixed
  });

  test("positions", () => {
    expect(dictionaries.get("d1")?.allPositions.map(({label}) => label)).toEqual([
      "t(dictionary.dict1-global.dict1item1)",
      "t(???.dict1-global.dict1item2)",
      "dict1item3",
    ]);
    expect(dictionaries.get("d2")?.activePositions.map(({label}) => label)).toEqual([
      "t(???.dict2-fac1.dict2item1)",
      "dict2item3",
    ]);
  });

  test("subsetFor global", () => {
    expect(dictsToIds(dictionaries.subsetFor(NO_FACILITY))).toEqual([
      {label: "d1", allPositions: ["d1p1", "d1p2", "d1p3"]},
      {label: "d3", allPositions: ["d3p1"]},
    ]);
  });

  test("subsetFor", () => {
    expect(dictsToIds(dictionaries.subsetFor("fac1"))).toEqual([
      {label: "d1", allPositions: ["d1p1", "d1p2", "d1p3"]},
      {label: "d2", allPositions: ["d2p1", "d2p2", "d2p3"]},
      {label: "d3", allPositions: ["d3p1", "d3p2"]},
    ]);
    expect(dictsToIds(dictionaries.subsetFor("fac2"))).toEqual([
      {label: "d1", allPositions: ["d1p1", "d1p2", "d1p3"]},
      {label: "d3", allPositions: ["d3p1", "d3p3"]},
    ]);
    expect(dictsToIds(dictionaries.subsetFor("fac8"))).toEqual([
      {label: "d1", allPositions: ["d1p1", "d1p2", "d1p3"]},
      {label: "d3", allPositions: ["d3p1"]},
    ]);
  });
});
