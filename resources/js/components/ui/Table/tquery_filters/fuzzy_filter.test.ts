import {FilterReductor} from "data-access/memo-api/tquery/filter_utils";
import {Schema} from "data-access/memo-api/tquery/types";
import {describe, expect, it} from "vitest";
import {buildFuzzyGlobalFilter, buildFuzzyTextualColumnFilter} from "./fuzzy_filter";

describe("buildFuzzyTextualColumnFilter", () => {
  const column = "col1";

  const schema: Schema = {columns: [{name: column, type: "text", nullable: true}]};
  const reductor = new FilterReductor(schema);

  function filter(text: string) {
    return reductor.reduce(buildFuzzyTextualColumnFilter(text, {column}));
  }

  it("processes global filters", () => {
    expect(filter("")).toEqual("always");
    expect(filter(" *")).toEqual({type: "column", column, op: "null", inv: true});
    expect(filter("'' ")).toEqual({type: "column", column, op: "null"});
  });

  it("processes single word filters", () => {
    expect(filter("abc")).toEqual({type: "column", column, op: "%v%", val: "abc"});
    expect(filter("*abc*")).toEqual({type: "column", column, op: "%v%", val: "abc"});
    expect(filter("abc*")).toEqual({type: "column", column, op: "v%", val: "abc"});
    expect(filter("*abc")).toEqual({type: "column", column, op: "%v", val: "abc"});
    expect(filter("'a b'")).toEqual({type: "column", column, op: "%v%", val: "a b"});
    expect(filter("'a b'*")).toEqual({type: "column", column, op: "v%", val: "a b"});
    expect(filter("*'a b'*")).toEqual({type: "column", column, op: "%v%", val: "a b"});
    expect(filter("'abc")).toEqual({type: "column", column, op: "%v%", val: "'abc"});
    expect(filter("a*b")).toEqual({type: "column", column, op: "%v%", val: "a*b"});
    expect(filter("  abc  ")).toEqual({type: "column", column, op: "%v%", val: "abc"});
    expect(filter(" ' abc ' ")).toEqual({type: "column", column, op: "%v%", val: " abc "});
    expect(filter("' '")).toEqual({type: "column", column, op: "%v%", val: " "});
    expect(filter(" ** ")).toEqual({type: "column", column, op: "%v%", val: "**"});
    expect(filter(" 'a'b'c ")).toEqual({type: "column", column, op: "%v%", val: "'a'b'c"});
    expect(filter(" 'a'b'c' ")).toEqual({type: "column", column, op: "%v%", val: "a'b'c"});
  });

  it("processes multi-word filters", () => {
    expect(filter("abc def")).toEqual({
      type: "op",
      op: "&",
      val: [
        {type: "column", column, op: "%v%", val: "abc"},
        {type: "column", column, op: "%v%", val: "def"},
      ],
    });
    expect(filter("*abc def*")).toEqual({
      type: "op",
      op: "&",
      val: [
        {type: "column", column, op: "%v", val: "abc"},
        {type: "column", column, op: "v%", val: "def"},
      ],
    });
    expect(filter("x 'y z' w")).toEqual({
      type: "op",
      op: "&",
      val: [
        {type: "column", column, op: "%v%", val: "x"},
        {type: "column", column, op: "%v%", val: "y z"},
        {type: "column", column, op: "%v%", val: "w"},
      ],
    });
    expect(filter("a'b c'd")).toEqual({
      type: "op",
      op: "&",
      val: [
        {type: "column", column, op: "%v%", val: "a'b"},
        {type: "column", column, op: "%v%", val: "c'd"},
      ],
    });
    expect(filter(" ' abc  ")).toEqual({
      type: "op",
      op: "&",
      val: [
        {type: "column", column, op: "%v%", val: "'"},
        {type: "column", column, op: "%v%", val: "abc"},
      ],
    });
    expect(filter("a *")).toEqual({
      type: "op",
      op: "&",
      val: [
        {type: "column", column, op: "%v%", val: "a"},
        {type: "column", column, op: "%v%", val: "*"},
      ],
    });
    expect(filter(" ' ' ' ")).toEqual({
      type: "op",
      op: "&",
      val: [
        {type: "column", column, op: "%v%", val: " "},
        {type: "column", column, op: "%v%", val: "'"},
      ],
    });
  });
});

describe("buildFuzzyGlobalFilter", () => {
  const columns = ["col1", "col2"];
  const schema: Schema = {columns: columns.map((name) => ({name, type: "text", nullable: true}))};
  const reductor = new FilterReductor(schema);

  const columnsByPrefix = new Map([["c1", "col1"]]);

  function filter(text: string) {
    return reductor.reduce(buildFuzzyGlobalFilter(text, {columns, columnsByPrefix}));
  }

  it("processes global filters", () => {
    expect(filter("")).toEqual("always");
  });

  it("processes global single word filters", () => {
    expect(filter(" abc")).toEqual({
      type: "op",
      op: "|",
      val: [
        {type: "column", column: "col1", op: "%v%", val: "abc"},
        {type: "column", column: "col2", op: "%v%", val: "abc"},
      ],
    });
    expect(filter("abc*")).toEqual({
      type: "op",
      op: "|",
      val: [
        {type: "column", column: "col1", op: "v%", val: "abc"},
        {type: "column", column: "col2", op: "v%", val: "abc"},
      ],
    });
    expect(filter("*'abc d'")).toEqual({
      type: "op",
      op: "|",
      val: [
        {type: "column", column: "col1", op: "%v", val: "abc d"},
        {type: "column", column: "col2", op: "%v", val: "abc d"},
      ],
    });
    expect(filter("''")).toEqual({
      type: "op",
      op: "|",
      val: [
        {type: "column", column: "col1", op: "%v%", val: "''"},
        {type: "column", column: "col2", op: "%v%", val: "''"},
      ],
    });
    expect(filter(" * ")).toEqual({
      type: "op",
      op: "|",
      val: [
        {type: "column", column: "col1", op: "%v%", val: "*"},
        {type: "column", column: "col2", op: "%v%", val: "*"},
      ],
    });
    expect(filter(" ** ")).toEqual({
      type: "op",
      op: "|",
      val: [
        {type: "column", column: "col1", op: "%v%", val: "**"},
        {type: "column", column: "col2", op: "%v%", val: "**"},
      ],
    });
  });

  it("processes prefixed single word filters", () => {
    expect(filter(" c1:abc")).toEqual({type: "column", column: "col1", op: "%v%", val: "abc"});
    expect(filter("c1:abc*")).toEqual({type: "column", column: "col1", op: "v%", val: "abc"});
    expect(filter("c1:*'ab cd'")).toEqual({type: "column", column: "col1", op: "%v", val: "ab cd"});
    expect(filter("c1=*ab")).toEqual({type: "column", column: "col1", op: "=", val: "*ab"});
    expect(filter("c1=*'ab cd'")).toEqual({type: "column", column: "col1", op: "=", val: "*'ab cd'"});
    expect(filter("c3:abc")).toEqual({
      type: "op",
      op: "|",
      val: [
        {type: "column", column: "col1", op: "%v%", val: "c3:abc"},
        {type: "column", column: "col2", op: "%v%", val: "c3:abc"},
      ],
    });
  });

  it("processes global multi-word filters", () => {
    expect(filter("abc def")).toEqual({
      type: "op",
      op: "&",
      val: [
        {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "col1", op: "%v%", val: "abc"},
            {type: "column", column: "col2", op: "%v%", val: "abc"},
          ],
        },
        {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "col1", op: "%v%", val: "def"},
            {type: "column", column: "col2", op: "%v%", val: "def"},
          ],
        },
      ],
    });
    expect(filter("abc* *def")).toEqual({
      type: "op",
      op: "&",
      val: [
        {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "col1", op: "v%", val: "abc"},
            {type: "column", column: "col2", op: "v%", val: "abc"},
          ],
        },
        {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "col1", op: "%v", val: "def"},
            {type: "column", column: "col2", op: "%v", val: "def"},
          ],
        },
      ],
    });
    expect(filter("x 'y z' w")).toEqual({
      type: "op",
      op: "&",
      val: [
        {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "col1", op: "%v%", val: "x"},
            {type: "column", column: "col2", op: "%v%", val: "x"},
          ],
        },
        {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "col1", op: "%v%", val: "y z"},
            {type: "column", column: "col2", op: "%v%", val: "y z"},
          ],
        },
        {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "col1", op: "%v%", val: "w"},
            {type: "column", column: "col2", op: "%v%", val: "w"},
          ],
        },
      ],
    });
  });
});
