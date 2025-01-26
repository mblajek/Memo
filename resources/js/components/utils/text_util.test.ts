// Since you've asked to write unit tests for the file, here is a basic example using a hypothetical test framework like Jest.

import {describe, expect, test} from "vitest";
import {createTextFilter, MatchType} from "./text_util"; // Adjust the import path as necessary

describe("text_util filter", () => {
  function check(
    filter: string,
    {type, match = [], noMatch = []}: {type?: MatchType; match?: string[]; noMatch?: string[]},
  ) {
    const predicate = createTextFilter(filter, type) || (() => true);
    for (const matching of match) {
      expect(predicate?.(matching), `${JSON.stringify(filter)} matches ${JSON.stringify(matching)}`).toBe(true);
    }
    for (const notMatching of noMatch) {
      expect(predicate?.(notMatching), `${JSON.stringify(filter)} doesn't match ${JSON.stringify(notMatching)}`).toBe(
        false,
      );
    }
  }

  test("filters in default mode", () => {
    check("", {match: ["", " a ", "x y"]});
    check("test", {match: ["test", "qwetestasd"], noMatch: ["estasdf", "te st"]});
    check(" a", {match: [" a", "zxc aqwe"], noMatch: ["a", "qwea"]});
  });

  test("filters in prefix mode", () => {
    check("", {type: "v%", match: ["", " a ", "x y"]});
    check("test", {type: "v%", match: ["test", "testasd"], noMatch: ["etest", "te st"]});
    check(" a", {type: "v%", match: [" a", " aqwe"], noMatch: ["a", "qwe a"]});
  });

  test("filters in suffix mode", () => {
    check("", {type: "%v", match: ["", " a ", "x y"]});
    check("test", {type: "%v", match: ["test", "asdtest"], noMatch: ["testasd", "te st"]});
    check(" a", {type: "%v", match: [" a", "aqwe a"], noMatch: ["a", "qwea"]});
  });

  test("filters in exact mode", () => {
    check("", {type: "=", match: [""], noMatch: [" a ", "x y"]});
    check("test", {type: "=", match: ["test"], noMatch: ["testasd", " test", "test "]});
    check(" a", {type: "=", match: [" a"], noMatch: ["a", "qwe a"]});
  });

  test("filters lowercase/uppercase, diacritics and special characters", () => {
    check("a", {match: ["a", "A", "ą", "Ą"]});
    check("A", {type: "=", match: ["A", "Ą"], noMatch: ["a", "ą"]});
    check("ą", {type: "%v", match: ["ą", "Ą"], noMatch: ["a", "A"]});
    check("á", {type: "v%", match: ["á", "Á"], noMatch: ["a", "A"]});
    check("Ą", {match: ["Ą"], noMatch: ["a", "A", "á", "Á", "ą"]});
    check("l", {match: ["l", "L", "ł", "Ł"]});
    check("L", {type: "=", match: ["L", "Ł"], noMatch: ["l", "ł"]});
    check("ł", {type: "%v", match: ["ł", "Ł"], noMatch: ["l", "L"]});
    check("Ł", {match: ["Ł"], noMatch: ["l", "L", "á", "Á", "ł"]});
    check('" -', {match: ['" -', '"\t-', "„ -", "„\t—"]});
    check("„ -", {match: ["„ -", "„\t—"], noMatch: ['" -', '"\t-']});
  });
});
