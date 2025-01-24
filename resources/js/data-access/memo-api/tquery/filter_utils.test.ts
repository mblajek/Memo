import {FilterHWithState} from "components/ui/Table/tquery_filters/types";
import {describe, expect, test} from "vitest";
import {FilterH, FilterReductor, invertFilter} from "./filter_utils";

describe("filter_utils", () => {
  const reductor = new FilterReductor({
    columns: [
      {name: "c-str", type: "string", nullable: false},
      {name: "c-nullable-str", type: "string", nullable: true},
      {name: "c-uuid-list", type: "uuid_list", nullable: true},
    ],
  });

  test("invertFilter", () => {
    expect(invertFilter({type: "column", column: "foo", op: "=", val: "bar"})).toEqual({
      type: "column",
      column: "foo",
      op: "=",
      val: "bar",
      inv: true,
    });
    expect(invertFilter({type: "column", column: "foo", op: "=", val: "bar", inv: true})).toEqual({
      type: "column",
      column: "foo",
      op: "=",
      val: "bar",
      inv: false,
    });
    expect(invertFilter("always")).toEqual("never");
    expect(invertFilter("never")).toEqual("always");
  });

  test("const", () => {
    expect(reductor.reduce("always")).toEqual("always");
    expect(reductor.reduce("never")).toEqual("never");
    expect(reductor.reduce({type: "const", val: "always"})).toEqual("always");
    expect(reductor.reduce({type: "const", val: "never"})).toEqual("never");
    expect(reductor.reduce({type: "const", val: "always", inv: false})).toEqual("always");
    expect(reductor.reduce({type: "const", val: "never", inv: false})).toEqual("never");
    expect(reductor.reduce({type: "const", val: "always", inv: true})).toEqual("never");
    expect(reductor.reduce({type: "const", val: "never", inv: true})).toEqual("always");
  });

  test("op null", () => {
    expect(reductor.reduce({type: "column", column: "c-str", op: "null"})).toEqual("never");
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: "null"})).toEqual({
      type: "column",
      column: "c-nullable-str",
      op: "null",
    });
  });

  test("empty string val", () => {
    expect(reductor.reduce({type: "column", column: "c-str", op: "=", val: ""})).toEqual("never");
    expect(reductor.reduce({type: "column", column: "c-str", op: ">", val: ""})).toEqual("always");
    expect(reductor.reduce({type: "column", column: "c-str", op: "<", val: ""})).toEqual("never");
    expect(reductor.reduce({type: "column", column: "c-str", op: ">=", val: ""})).toEqual("always");
    expect(reductor.reduce({type: "column", column: "c-str", op: "<=", val: ""})).toEqual("never");
    expect(reductor.reduce({type: "column", column: "c-str", op: "v%", val: ""})).toEqual("always");

    const nullFilter = {type: "column", column: "c-nullable-str", op: "null"};
    const notNullFilter = {...nullFilter, inv: true};
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: "=", val: ""})).toEqual(nullFilter);
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: ">", val: ""})).toEqual(notNullFilter);
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: "<", val: ""})).toEqual("never");
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: ">=", val: ""})).toEqual("always");
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: "<=", val: ""})).toEqual(nullFilter);
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: "v%", val: ""})).toEqual("always");
  });

  test("untrimmed string val", () => {
    expect(reductor.reduce({type: "column", column: "c-str", op: "=", val: "foo  "})).toEqual("never");
    expect(reductor.reduce({type: "column", column: "c-str", op: "<", val: "foo  "})).toEqual({
      type: "column",
      column: "c-str",
      op: "<",
      val: "foo  ",
    });

    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: "=", val: "foo  "})).toEqual("never");
    expect(reductor.reduce({type: "column", column: "c-nullable-str", op: "<", val: "foo  "})).toEqual({
      type: "column",
      column: "c-nullable-str",
      op: "<",
      val: "foo  ",
    });
  });

  describe("has_* filters", () => {
    test("empty val", () => {
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_all", val: []})).toEqual("always");
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_any", val: []})).toEqual("never");
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_only", val: []})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "null",
      });
    });

    test("single element in val", () => {
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_all", val: ["x"]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "has",
        val: "x",
      });
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_any", val: ["x"]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "has",
        val: "x",
      });
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_only", val: ["x"]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "has_only",
        val: ["x"],
      });
    });

    test("empty string in val", () => {
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_all", val: [""]})).toEqual("never");
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_any", val: [""]})).toEqual("never");
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_only", val: [""]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "null",
      });

      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_all", val: ["", "x"]})).toEqual("never");
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_any", val: ["", "x"]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "has",
        val: "x",
      });
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_only", val: ["", "x"]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "has_only",
        val: ["x"],
      });
    });

    test("untrimmed string in val", () => {
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_all", val: ["x  "]})).toEqual("never");
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_any", val: ["x  "]})).toEqual("never");
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_only", val: ["x  "]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "null",
      });

      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_all", val: ["x  ", "y"]})).toEqual(
        "never",
      );
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_any", val: ["x  ", "y"]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "has",
        val: "y",
      });
      expect(reductor.reduce({type: "column", column: "c-uuid-list", op: "has_only", val: ["x  ", "y"]})).toEqual({
        type: "column",
        column: "c-uuid-list",
        op: "has_only",
        val: ["y"],
      });
    });
  });

  describe("bool op filters", () => {
    test("empty val", () => {
      expect(reductor.reduce({type: "op", op: "&", val: []})).toEqual("always");
      expect(reductor.reduce({type: "op", op: "|", val: []})).toEqual("never");
    });

    test("single element in val", () => {
      const f: FilterH = {type: "column", column: "c-uuid-list", op: "has_all", val: ["x", "y", "z"]};
      expect(reductor.reduce({type: "op", op: "&", val: [f]})).toEqual(f);
      expect(reductor.reduce({type: "op", op: "|", val: [f]})).toEqual(f);
    });

    test("always/never in val", () => {
      const alwaysFilter: FilterH = {type: "column", column: "c-str", op: "v%", val: ""};
      const neverFilter: FilterH = {type: "column", column: "c-str", op: "v%", val: "", inv: true};
      expect(reductor.reduce(alwaysFilter)).toEqual("always");
      expect(reductor.reduce(neverFilter)).toEqual("never");

      const f: FilterH = {type: "column", column: "c-uuid-list", op: "has_all", val: ["x", "y", "z"]};
      expect(reductor.reduce({type: "op", op: "&", val: [alwaysFilter, f]})).toEqual(f);
      expect(reductor.reduce({type: "op", op: "&", val: [neverFilter, f]})).toEqual("never");
      expect(reductor.reduce({type: "op", op: "&", val: [alwaysFilter, neverFilter, f]})).toEqual("never");
      expect(reductor.reduce({type: "op", op: "|", val: [alwaysFilter, f]})).toEqual("always");
      expect(reductor.reduce({type: "op", op: "|", val: [neverFilter, f]})).toEqual(f);
      expect(reductor.reduce({type: "op", op: "|", val: [alwaysFilter, neverFilter, f]})).toEqual("always");

      expect(reductor.reduce({type: "op", op: "&", val: [alwaysFilter, f], inv: true})).toEqual(invertFilter(f));
      expect(reductor.reduce({type: "op", op: "&", val: [neverFilter, f], inv: true})).toEqual("always");
      expect(reductor.reduce({type: "op", op: "&", val: [alwaysFilter, neverFilter, f], inv: true})).toEqual("always");
      expect(reductor.reduce({type: "op", op: "|", val: [alwaysFilter, f], inv: true})).toEqual("never");
      expect(reductor.reduce({type: "op", op: "|", val: [neverFilter, f], inv: true})).toEqual(invertFilter(f));
      expect(reductor.reduce({type: "op", op: "|", val: [alwaysFilter, neverFilter, f], inv: true})).toEqual("never");
    });

    test("nested bool op filters", () => {
      const f: FilterH = {type: "column", column: "c-uuid-list", op: "has_all", val: ["x", "y", "z"]};
      const g: FilterH = {type: "column", column: "c-str", op: "v%", val: "foo"};
      const h: FilterH = {type: "column", column: "c-nullable-str", op: "=", val: "bar"};

      expect(
        reductor.reduce({
          type: "op",
          op: "&",
          val: [
            {type: "op", op: "&", val: [f, g]},
            {type: "op", op: "&", val: [h]},
          ],
        }),
      ).toEqual({type: "op", op: "&", val: [f, g, h]});
      expect(
        reductor.reduce({
          type: "op",
          op: "|",
          val: [
            {type: "op", op: "|", val: [f, g]},
            {type: "op", op: "|", val: [h]},
          ],
        }),
      ).toEqual({type: "op", op: "|", val: [f, g, h]});

      expect(
        reductor.reduce({
          type: "op",
          op: "&",
          val: [
            {type: "op", op: "|", val: [f, g], inv: true},
            {type: "op", op: "|", val: [h], inv: true},
          ],
        }),
      ).toEqual({type: "op", op: "&", val: [invertFilter(f), invertFilter(g), invertFilter(h)]});
      expect(
        reductor.reduce({
          type: "op",
          op: "|",
          val: [
            {type: "op", op: "&", val: [f, g], inv: true},
            {type: "op", op: "&", val: [h], inv: true},
          ],
        }),
      ).toEqual({type: "op", op: "|", val: [invertFilter(f), invertFilter(g), invertFilter(h)]});
    });
  });

  test("removes state", () => {
    type FS = FilterHWithState<{}>;
    const f: FilterH = {type: "column", column: "c-str", op: "=", val: "f"};
    const g: FilterH = {type: "column", column: "c-str", op: "=", val: "g"};

    expect(
      reductor.reduce({
        type: "op",
        op: "&",
        val: [f, g],
        state: {},
      } satisfies FS as FS),
    ).toEqual({type: "op", op: "&", val: [f, g]});
    expect(
      reductor.reduce({
        type: "op",
        op: "&",
        val: [{...f, state: {}} satisfies FS as FS],
      }),
    ).toEqual(f);
  });
});
