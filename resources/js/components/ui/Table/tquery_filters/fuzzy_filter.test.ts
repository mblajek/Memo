import {LangFunc} from "components/utils";
import {Dictionaries} from "data-access/memo-api/dictionaries";
import {FilterReductor} from "data-access/memo-api/tquery/filter_utils";
import {Schema} from "data-access/memo-api/tquery/types";
import {describe, expect, it} from "vitest";
import {buildFuzzyGlobalFilter, buildFuzzyTextualColumnFilter, buildFuzzyTextualLocalFilter} from "./fuzzy_filter";

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
  describe("for textual columns", () => {
    const schema: Schema = {
      columns: [
        {name: "col1", type: "string", nullable: true},
        {name: "col2", type: "text", nullable: true},
      ],
    };
    const reductor = new FilterReductor(schema);

    const columnsByPrefix = new Map([["c1", "col1"]]);

    function filter(text: string) {
      return reductor.reduce(buildFuzzyGlobalFilter(text, {schema, columnsByPrefix}));
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

    it("processes multi-word filters with prefixes", () => {
      expect(filter("c1:abc def")).toEqual({
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "col1", op: "%v%", val: "abc"},
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
      expect(
        reductor.reduce(buildFuzzyGlobalFilter("c1:abc def", {schema, columns: ["col2"], columnsByPrefix})),
      ).toEqual({
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "col1", op: "%v%", val: "abc"},
          {type: "column", column: "col2", op: "%v%", val: "def"},
        ],
      });
      expect(
        reductor.reduce(buildFuzzyGlobalFilter("c1:abc def", {schema, skipColumns: ["col1"], columnsByPrefix})),
      ).toEqual({
        type: "op",
        op: "&",
        val: [
          {type: "column", column: "col1", op: "%v%", val: "abc"},
          {type: "column", column: "col2", op: "%v%", val: "def"},
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

  describe("for dict columns", () => {
    const dictionaries = Dictionaries.fromResources(((key) => `t(${key})`) as LangFunc, [
      {
        id: "dictA",
        name: "dictA",
        facilityId: null,
        isFixed: true,
        isExtendable: false,
        positions: [
          {
            id: "dictA1",
            name: "+qq pozycja A 1",
            dictionaryId: "dictA",
            facilityId: null,
            isDisabled: false,
            isFixed: false,
            defaultOrder: 0,
            positionGroupDictId: null,
          },
          {
            id: "dictA2",
            name: "+ww pozycja A 2",
            dictionaryId: "dictA",
            facilityId: null,
            isDisabled: false,
            isFixed: false,
            defaultOrder: 0,
            positionGroupDictId: null,
          },
          {
            id: "dictA3",
            name: "+ee pozycja A 3",
            dictionaryId: "dictA",
            facilityId: null,
            isDisabled: false,
            isFixed: false,
            defaultOrder: 0,
            positionGroupDictId: null,
          },
        ],
      },
      {
        id: "dictB",
        name: "dictB",
        facilityId: null,
        isFixed: true,
        isExtendable: false,
        positions: [
          {
            id: "dictB1",
            name: "+ww pozycja B 1",
            dictionaryId: "dictB",
            facilityId: null,
            isDisabled: false,
            isFixed: false,
            defaultOrder: 0,
            positionGroupDictId: null,
          },
          {
            id: "dictB2",
            name: "+ee pozycja B 2",
            dictionaryId: "dictB",
            facilityId: null,
            isDisabled: false,
            isFixed: false,
            defaultOrder: 0,
            positionGroupDictId: null,
          },
          {
            id: "dictB3",
            name: "+rr pozycja B 3",
            dictionaryId: "dictB",
            facilityId: null,
            isDisabled: false,
            isFixed: false,
            defaultOrder: 0,
            positionGroupDictId: null,
          },
        ],
      },
    ]);
    const schema: Schema = {
      columns: [
        {name: "col1", type: "dict", dictionaryId: "dictA", nullable: true},
        {name: "col2", type: "dict", dictionaryId: "dictA", nullable: false},
        {name: "col3", type: "dict_list", dictionaryId: "dictB", nullable: true},
      ],
    };
    const reductor = new FilterReductor(schema);

    const columnsByPrefix = new Map([["c1", "col1"]]);

    function filter(text: string) {
      return reductor.reduce(buildFuzzyGlobalFilter(text, {schema, dictionaries, columnsByPrefix}));
    }

    it("processes global single word filters", () => {
      expect(filter("abc*")).toEqual("never");
      expect(filter("''")).toEqual("never");
      expect(filter("*")).toEqual("never");
      expect(filter(" ww*")).toEqual({
        type: "op",
        op: "|",
        val: [
          {type: "column", column: "col1", op: "=", val: "dictA2"},
          {type: "column", column: "col2", op: "=", val: "dictA2"},
          {type: "column", column: "col3", op: "has", val: "dictB1"},
        ],
      });
      expect(filter("'w poz'")).toEqual({
        type: "op",
        op: "|",
        val: [
          {type: "column", column: "col1", op: "=", val: "dictA2"},
          {type: "column", column: "col2", op: "=", val: "dictA2"},
          {type: "column", column: "col3", op: "has", val: "dictB1"},
        ],
      });
      expect(filter("*'zycja a'*")).toEqual("always");
      expect(filter("*'zycja b'*")).toEqual({type: "column", column: "col3", op: "null", inv: true});
    });

    it("processes prefixed single word filters", () => {
      expect(filter("c1:ww*")).toEqual({type: "column", column: "col1", op: "=", val: "dictA2"});
      expect(filter("c1=ww*")).toEqual("never");
      expect(filter("c1='ww po'*")).toEqual("never");
      expect(filter("c1='ww pozycja a 2'")).toEqual({type: "column", column: "col1", op: "=", val: "dictA2"});
      expect(filter("c1='ww pozycja a 2'*")).toEqual("never");
      expect(filter("c2:poz")).toEqual("never");
    });
  });

  describe("local filtering", () => {
    function checkFilter(filter: string, {match = [], noMatch = []}: {match?: string[]; noMatch?: string[]}) {
      const predicate = buildFuzzyTextualLocalFilter(filter) || (() => true);
      for (const matching of match) {
        expect(predicate(matching), `${JSON.stringify(filter)} matches ${JSON.stringify(matching)}`).toBe(true);
      }
      for (const notMatching of noMatch) {
        expect(predicate(notMatching), `${JSON.stringify(filter)} doesn't match ${JSON.stringify(notMatching)}`).toBe(
          false,
        );
      }
    }

    it("processes global filters", () => {
      checkFilter("*", {match: ["qwe", "qweasd", "qwe123", " "], noMatch: [""]});
      checkFilter("''", {match: [""], noMatch: ["qwe", " "]});
    });

    it("processes single word filters", () => {
      checkFilter("abc", {match: ["abc", "qweabcasd", "abc123"], noMatch: ["qwe", "qweasd", "qwe123"]});
      checkFilter("*abc*", {match: ["abc", "qweabcasd", "abc123"], noMatch: ["qwe", "qweasd", "qwe123"]});
      checkFilter("abc*", {match: ["abc123"], noMatch: ["qweabcasd", "qwe"]});
      checkFilter("*abc", {match: ["qweabc", "123abc"], noMatch: ["qwe", "qweabcasd", "abc123"]});
      checkFilter("'a b'", {match: ["qwea b asd", "qwea b 123"], noMatch: ["a  b", "qweasd", "qwe123"]});
      checkFilter("*'a b'", {match: ["qwea b", "a b"], noMatch: ["a  b", "qwea basd"]});
    });

    it("processes multi-word filters", () => {
      checkFilter("abc def", {match: ["abc def", "defasd qweabc tttt", "zabcdefz"], noMatch: ["abc", "bcdef"]});
      checkFilter("abc* def", {match: ["abc def"], noMatch: ["defasd qweabc tttt", "zabcdefz", "abc", "bcdef"]});
    });
  });
});
