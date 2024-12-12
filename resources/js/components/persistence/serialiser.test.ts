import {JSONValue} from "data-access/memo-api/types";
import "init_luxon";
import {DateTime, Duration, Interval} from "luxon";
import {describe, expect, it} from "vitest";
import {DaysRange} from "../ui/calendar/days_range";
import {richJSONConverter, richJSONSerialiser, RichJSONValue} from "./serialiser";

describe("serialiser", () => {
  const SERIALISER = richJSONSerialiser();

  const DATE1 = DateTime.fromISO("2015-09-09T17:40:00");

  function testRichJSON(rich: RichJSONValue, plain: JSONValue) {
    expect(richJSONConverter.toPlain(rich)).toEqual(plain);
    expect(richJSONConverter.fromPlain(plain)).toEqual(rich);

    expect(JSON.parse(SERIALISER.serialise(rich))).toEqual(plain);
    expect(SERIALISER.deserialise(JSON.stringify(plain))).toEqual(rich);
  }

  describe("rich JSON", () => {
    it("serialises", () => {
      testRichJSON(null, null);
      testRichJSON(true, true);
      testRichJSON(563, 563);
      testRichJSON("qweq", "qweq");
      testRichJSON(DATE1, {__rjs: "DateTime", value: DATE1.toISO()});
      testRichJSON(Duration.fromObject({minutes: 5}), {__rjs: "Duration", value: "PT5M"});
      testRichJSON(
        [563, "qweq", DATE1, false, null, Duration.fromObject({minutes: 5})],
        [563, "qweq", {__rjs: "DateTime", value: DATE1.toISO()}, false, null, {__rjs: "Duration", value: "PT5M"}],
      );

      testRichJSON(
        new Set([563, "qweq", DATE1, [563, "qweq", DATE1, false, null, Duration.fromObject({minutes: 5})]]),
        {
          __rjs: "Set",
          value: [
            563,
            "qweq",
            {__rjs: "DateTime", value: DATE1.toISO()},
            [563, "qweq", {__rjs: "DateTime", value: DATE1.toISO()}, false, null, {__rjs: "Duration", value: "PT5M"}],
          ],
        },
      );

      testRichJSON(
        new Map<RichJSONValue, RichJSONValue>([
          ["a", 563],
          ["b", "qweq"],
          [DATE1, Duration.fromObject({minutes: 5})],
          [
            [563, "qweq", DATE1, false, null, Duration.fromObject({minutes: 5})],
            new Set([
              563,
              "qweq",
              DATE1,
              [563, "qweq", DATE1, false, null, Duration.fromObject({minutes: 5})],
              new Map<RichJSONValue, RichJSONValue>([[DATE1, null]]),
            ]),
          ],
          [new DaysRange(DATE1, DATE1.plus({days: 8})), ""],
          [null, Interval.after(DATE1, {minutes: 1})],
        ]),
        {
          __rjs: "Map",
          value: [
            ["a", 563],
            ["b", "qweq"],
            [
              {__rjs: "DateTime", value: DATE1.toISO()},
              {__rjs: "Duration", value: "PT5M"},
            ],
            [
              [563, "qweq", {__rjs: "DateTime", value: DATE1.toISO()}, false, null, {__rjs: "Duration", value: "PT5M"}],
              {
                __rjs: "Set",
                value: [
                  563,
                  "qweq",
                  {__rjs: "DateTime", value: DATE1.toISO()},
                  [
                    563,
                    "qweq",
                    {__rjs: "DateTime", value: DATE1.toISO()},
                    false,
                    null,
                    {__rjs: "Duration", value: "PT5M"},
                  ],
                  {__rjs: "Map", value: [[{__rjs: "DateTime", value: DATE1.toISO()}, null]]},
                ],
              },
            ],
            [{__rjs: "DaysRange", value: {start: "2015-09-09", end: "2015-09-17"}}, ""],
            [null, {__rjs: "Interval", value: Interval.after(DATE1, {minutes: 1}).toISO()}],
          ],
        },
      );
    });

    it("skips undefined values", () => {
      const json: {a: "a"; b?: "b"; c: {d?: "d"}} = {a: "a", b: undefined, c: {d: undefined}};
      expect(richJSONConverter.toPlain(json)).toEqual({a: "a", c: {}});
      expect(SERIALISER.serialise(json)).toEqual(`{"a":"a","c":{}}`);
    });
  });
});
