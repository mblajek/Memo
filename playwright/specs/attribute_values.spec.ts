import {attributeToCreate, clientAttributes} from "../helpers/queries.ts";
import {
  type AttributeValuesArtifact,
  FILLED_VALUES,
  REQUIRED_ONLY_LABEL,
  VALUE_API_NAMES,
  VALUE_ATTRS,
  attributeValuesLayer,
} from "../lib/layers/attribute_values.ts";
import {ADMIN, STAFF} from "../lib/layers/facility.ts";
import {createdId, expectValidationErrors} from "../lib/responses.ts";
import {MemoAPI, expect, readOnlyTest, test} from "../lib/test.ts";

/**
 * API-level tests of the values of custom attributes: a client attribute of each type and of each
 * requirement level (the layer's), the types the attributes page does not offer, and the
 * attributes of dictionary positions.
 */

const FAIL = {allowFailure: true} as const;

/** The values of the layer's attributes in the object, an absent one as `undefined`. */
function e2eValues(object: Readonly<Record<string, unknown>>, prefix = "") {
  return Object.fromEntries(VALUE_API_NAMES.map((apiName) => [apiName, object[`${prefix}${apiName}`]]));
}

/** The values a client cannot be created without. */
function requiredValues({sizeIds}: AttributeValuesArtifact) {
  return {e2eLabel: "Required", e2eSize: sizeIds.small, e2eSizes: [sizeIds.small]};
}

attributeValuesLayer.describe((artifact) => {
  const adminPath = () => `facility/${artifact().facilityId}/admin`;
  const clientsPath = () => `facility/${artifact().facilityId}/user/client`;
  const clientValues = async (api: MemoAPI, clientId: string) =>
    e2eValues(await clientAttributes(api, artifact().facilityId, clientId));
  /** The rows of the clients tquery with the given columns, of the clients matching the filter. */
  async function clientRows(api: MemoAPI, columns: readonly string[], filter?: unknown, sort?: string) {
    return (
      await api.tquery(`${clientsPath()}/tquery`, {
        columns,
        ...(filter ? {filter} : {}),
        sort: [{column: sort ?? "name"}],
      })
    ).rows;
  }
  /** The types of the columns of the clients tquery by name, a nullable one with a "?". */
  async function columnTypes(api: MemoAPI) {
    const {columns} = (await (await api.get(`${clientsPath()}/tquery`)).json()) as {
      columns: readonly {name: string; type: string; nullable?: boolean}[];
    };
    return Object.fromEntries(columns.map(({name, type, nullable}) => [name, `${type}${nullable ? "?" : ""}`]));
  }
  const columnFilter = (apiName: string, op: string, val?: unknown) => ({
    type: "column",
    column: `client.${apiName}`,
    op,
    ...(val === undefined ? {} : {val}),
  });

  readOnlyTest("the values of each type are returned by the client endpoint and by the tquery", async ({api}) => {
    const {sizeIds, filledClientId, requiredOnlyClientId, adultClientInfos} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const filled = {...FILLED_VALUES, e2eSize: sizeIds.medium, e2eSizes: [sizeIds.large, sizeIds.small]};
    const requiredOnly = {e2eLabel: REQUIRED_ONLY_LABEL, e2eSize: sizeIds.small, e2eSizes: [sizeIds.medium]};
    const noneId = adultClientInfos[2]!.id;

    await test.step("the client endpoint leaves out what has no value", async () => {
      // An attribute of the level `empty` holds a value like any other.
      expect(await clientValues(staffApi, filledClientId)).toEqual(filled);
      expect(await clientValues(staffApi, requiredOnlyClientId)).toEqual(e2eValues(requiredOnly));
      expect(await clientValues(staffApi, noneId)).toEqual(e2eValues({}));
      const client = await clientAttributes(staffApi, artifact().facilityId, filledClientId);
      for (const separator of [VALUE_ATTRS.basics, VALUE_ATTRS.lists]) {
        expect(client).not.toHaveProperty(separator.apiName);
      }
    });

    await test.step("the tquery has a column per attribute, null or an empty list for no value", async () => {
      const columns = VALUE_API_NAMES.map((apiName) => `client.${apiName}`);
      const rows = await clientRows(staffApi, ["id", ...columns], {
        type: "column",
        column: "id",
        op: "in",
        val: [filledClientId, requiredOnlyClientId, noneId],
      });
      const empty = Object.fromEntries(
        Object.values(VALUE_ATTRS)
          .filter(({type}) => type !== "separator")
          .map(({apiName, isMultiValue}) => [apiName, isMultiValue ? [] : null]),
      );
      expect(Object.fromEntries(rows.map((row) => [row.id, e2eValues(row, "client.")]))).toEqual({
        [filledClientId]: filled,
        [requiredOnlyClientId]: {...empty, ...requiredOnly},
        // Also the required attributes: the client was there before them.
        [noneId]: empty,
      });
    });

    await test.step("the columns are typed after the attributes; a separator has none", async () => {
      const e2eColumns = Object.fromEntries(
        Object.entries(await columnTypes(staffApi))
          .filter(([name]) => name.startsWith("client.e2e"))
          .map(([name, type]) => [name.replace("client.", ""), type]),
      );
      expect(e2eColumns).toEqual({
        "e2eFlag": "bool?",
        "e2eDay": "date?",
        "e2eMoment": "datetime?",
        "e2eCount": "int?",
        "e2eLabel": "string",
        "e2eStory": "text?",
        "e2eSize": "dict",
        "e2eTags": "string_list?",
        "e2eTags.count": "int",
        "e2eNumbers": "list?",
        "e2eNumbers.count": "int",
        "e2eDays": "list?",
        "e2eDays.count": "int",
        "e2eSizes": "dict_list?",
        "e2eSizes.count": "int",
        "e2eLegacy": "string?",
      });
    });
  });

  test("a client is created with a value of each type; the values are changed and cleared", async ({api}) => {
    const {facilityId, sizeIds} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const {clientType} = await staffApi.dictionaries();
    const created = {
      e2eFlag: false,
      e2eDay: "2000-01-01",
      e2eMoment: "1999-12-31T23:59:59Z",
      e2eCount: 0,
      e2eLabel: "Zażółć gęślą jaźń",
      e2eStory: `${"long ".repeat(799)}text.`,
      e2eSize: sizeIds.large,
      e2eTags: ["one"],
      e2eNumbers: [-7],
      e2eDays: ["2030-06-15"],
      e2eSizes: [sizeIds.small, sizeIds.medium, sizeIds.large],
      e2eLegacy: "x",
    };
    expect(created.e2eStory).toHaveLength(4000);
    const clientId = await createdId(
      await staffApi.createFacilityClient(facilityId, {
        name: "Every Type",
        client: {typeDictId: clientType!.adult!, ...created},
      }),
    );
    // A false and a zero are values, not the lack of one.
    expect(await clientValues(staffApi, clientId)).toEqual(created);

    const changed = {
      e2eFlag: true,
      e2eDay: "2024-02-29",
      e2eMoment: "2038-01-19T03:14:08Z",
      e2eCount: 2147483647,
      e2eLabel: "Other",
      e2eStory: "Short",
      e2eSize: sizeIds.small,
      e2eTags: ["b", "a", "c"],
      e2eNumbers: [10, -10, 5],
      e2eDays: ["2024-12-31", "2024-01-01"],
      e2eSizes: [sizeIds.large],
      e2eLegacy: "y",
    };
    await staffApi.patch(`${clientsPath()}/${clientId}`, {client: changed});
    expect(await clientValues(staffApi, clientId)).toEqual(changed);

    await test.step("a patch of one value leaves the others", async () => {
      await staffApi.patch(`${clientsPath()}/${clientId}`, {client: {e2eCount: 1}});
      expect(await clientValues(staffApi, clientId)).toEqual({
        ...changed,
        e2eCount: 1,
      });
    });

    await test.step("all but the required ones are cleared: with null, an empty text or an empty list", async () => {
      await staffApi.patch(`${clientsPath()}/${clientId}`, {
        client: {
          e2eFlag: null,
          e2eDay: null,
          e2eMoment: null,
          e2eCount: null,
          e2eStory: "",
          e2eTags: [],
          e2eNumbers: null,
          e2eDays: [],
          e2eLegacy: null,
        },
      });
      const {e2eLabel, e2eSize, e2eSizes} = changed;
      expect(await clientValues(staffApi, clientId)).toEqual(e2eValues({e2eLabel, e2eSize, e2eSizes}));
    });
  });

  readOnlyTest("a value of the wrong type is refused, for each type", async ({api}) => {
    const {filledClientId, sizeIds, staffUserId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const {gender} = await staffApi.dictionaries();
    const before = await clientValues(staffApi, filledClientId);
    const dataType = "validation.custom.data_type";
    const dateFormat = "validation.date_format";
    const notInDictionary = "validation.custom.position_in_dictionary";
    // The value, and the code of the error; the field of the error unless it is the attribute's.
    const cases: readonly (readonly [apiName: string, value: unknown, code: string, field?: string])[] = [
      ["e2eFlag", "yes", "validation.boolean"],
      ["e2eFlag", "true", "validation.boolean"],
      ["e2eFlag", 1, dataType],
      ["e2eDay", "2024-02-30", dateFormat],
      ["e2eDay", "29.02.2024", dateFormat],
      ["e2eDay", "2024-02-28T10:00:00Z", dateFormat],
      ["e2eDay", 20240228, "validation.string"],
      ["e2eMoment", "2024-03-04", dateFormat],
      // Only UTC, marked with a "Z", is taken.
      ["e2eMoment", "2024-03-04T10:30:00", dateFormat],
      ["e2eMoment", "2024-03-04T10:30:00+01:00", dateFormat],
      ["e2eMoment", "2024-03-04T25:30:00Z", dateFormat],
      ["e2eCount", "many", "validation.numeric"],
      ["e2eCount", "7", dataType],
      ["e2eCount", 1.5, "validation.integer"],
      ["e2eCount", true, "validation.numeric"],
      ["e2eLabel", "x".repeat(251), "validation.max.string"],
      ["e2eLabel", 5, "validation.string"],
      ["e2eLabel", " padded ", "validation.custom.trimmed"],
      ["e2eLabel", ["a"], "validation.string"],
      ["e2eStory", "x".repeat(4001), "validation.max.string"],
      ["e2eStory", 5, "validation.string"],
      ["e2eSize", gender!.male!, notInDictionary],
      ["e2eSize", staffUserId, notInDictionary],
      ["e2eSize", "medium", "validation.uuid"],
      ["e2eSize", [sizeIds.small], "validation.string"],
      // A list where a single value is expected, and the other way round.
      ["e2eCount", [1], "validation.numeric"],
      ["e2eTags", "one", "validation.array"],
      ["e2eNumbers", 1, "validation.array"],
      ["e2eSizes", sizeIds.small, "validation.array"],
      ["e2eTags", {a: "one"}, dataType],
      // Each value of a list is checked as a single one.
      ["e2eTags", ["ok", null], "validation.required", "e2eTags.1"],
      ["e2eTags", ["ok", ""], "validation.required", "e2eTags.1"],
      ["e2eTags", ["x".repeat(251)], "validation.max.string", "e2eTags.0"],
      ["e2eTags", [1], "validation.string", "e2eTags.0"],
      ["e2eNumbers", [1, "two"], "validation.numeric", "e2eNumbers.1"],
      ["e2eDays", ["2024-01-01", "2024-13-01"], dateFormat, "e2eDays.1"],
      ["e2eSizes", [sizeIds.small, gender!.male!], notInDictionary, "e2eSizes.1"],
      // A separator is not a field at all, and neither is an unknown name.
      ["e2eBasics", "x", "validation.missing"],
      ["e2eBasics", null, "validation.missing"],
    ];
    for (const [apiName, value, code, field = apiName] of cases) {
      await test.step(`${apiName}: ${JSON.stringify(value).slice(0, 40)}`, async () => {
        const res = await staffApi.patch(`${clientsPath()}/${filledClientId}`, {client: {[apiName]: value}}, FAIL);
        await expectValidationErrors(res, [{field: `client.${field}`, code}]);
      });
    }
    await expectValidationErrors(
      await staffApi.patch(`${clientsPath()}/${filledClientId}`, {client: {e2eNoSuchAttribute: "x"}}, FAIL),
      [{field: "client", code: "validation.array"}],
    );
    expect(await clientValues(staffApi, filledClientId)).toEqual(before);
  });

  test("an integer out of the range of 32 bits is refused; the ends of the range are stored", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const path = `${clientsPath()}/${artifact().filledClientId}`;
    for (const [value, code] of [
      [2147483648, "validation.max.numeric"],
      [-2147483649, "validation.min.numeric"],
    ] as const) {
      await expectValidationErrors(await staffApi.patch(path, {client: {e2eCount: value}}, FAIL), [
        {field: "client.e2eCount", code},
      ]);
    }
    for (const value of [2147483647, -2147483648]) {
      await staffApi.patch(path, {client: {e2eCount: value}});
      expect((await clientValues(staffApi, artifact().filledClientId)).e2eCount).toBe(value);
    }
  });

  readOnlyTest("a required attribute is required, on create and when cleared", async ({api}) => {
    const {facilityId, filledClientId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const {clientType} = await staffApi.dictionaries();
    const required = requiredValues(artifact());
    const create = (client: Record<string, unknown>) =>
      staffApi.createFacilityClient(
        facilityId,
        {name: "Refused", client: {typeDictId: clientType!.adult!, ...client}},
        FAIL,
      );
    const total = async () => (await staffApi.tquery(`${clientsPath()}/tquery`, {columns: ["id"]})).total;
    const totalBefore = await total();
    const before = await clientValues(staffApi, filledClientId);

    await test.step("create", async () => {
      await expectValidationErrors(await create({}), [
        {field: "client.e2eLabel", code: "validation.present"},
        {field: "client.e2eSize", code: "validation.present"},
        {field: "client.e2eSizes", code: "validation.present"},
      ]);
      await expectValidationErrors(await create({e2eLabel: null, e2eSize: null, e2eSizes: null}), [
        {field: "client.e2eLabel", code: "validation.required"},
        {field: "client.e2eSize", code: "validation.required"},
        {field: "client.e2eSizes", code: "validation.required"},
      ]);
      // An empty text is no value, and a required list needs an element.
      await expectValidationErrors(await create({...required, e2eLabel: "", e2eSizes: []}), [
        {field: "client.e2eLabel", code: "validation.required"},
        {field: "client.e2eSizes", code: "validation.min.array"},
      ]);
      await expectValidationErrors(await create({...required, e2eSizes: [null]}), [
        {field: "client.e2eSizes.0", code: "validation.required"},
      ]);
    });

    await test.step("patch", async () => {
      for (const [apiName, value, code] of [
        ["e2eLabel", null, "validation.required"],
        ["e2eLabel", "", "validation.required"],
        ["e2eSize", null, "validation.required"],
        ["e2eSizes", null, "validation.required"],
        ["e2eSizes", [], "validation.min.array"],
      ] as const) {
        const res = await staffApi.patch(`${clientsPath()}/${filledClientId}`, {client: {[apiName]: value}}, FAIL);
        await expectValidationErrors(res, [{field: `client.${apiName}`, code}]);
      }
    });

    expect(await total()).toBe(totalBefore);
    expect(await clientValues(staffApi, filledClientId)).toEqual(before);
  });

  test("the other requirement levels take no value, and any value", async ({api}) => {
    const {facilityId, adultClientInfos} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const {clientType} = await staffApi.dictionaries();
    const required = requiredValues(artifact());

    await test.step("a client is created with the required values only", async () => {
      const clientId = await createdId(
        await staffApi.createFacilityClient(facilityId, {
          name: "Only Required",
          client: {typeDictId: clientType!.adult!, ...required},
        }),
      );
      expect(await clientValues(staffApi, clientId)).toEqual(e2eValues(required));
      // Sent empty, the recommended, the optional and the `empty` one are as good as not sent.
      await staffApi.patch(`${clientsPath()}/${clientId}`, {
        client: {e2eDay: null, e2eFlag: null, e2eTags: null, e2eLegacy: null},
      });
      expect(await clientValues(staffApi, clientId)).toEqual(e2eValues(required));
    });

    await test.step("a client from before the required attributes is patched without them", async () => {
      const clientId = adultClientInfos[2]!.id;
      await staffApi.patch(`${clientsPath()}/${clientId}`, {client: {e2eCount: 3, addressCity: "Lublin"}});
      expect(await clientValues(staffApi, clientId)).toEqual(e2eValues({e2eCount: 3}));
      // Sent empty, they are refused: the edit form, which sends every field, cannot save the
      // client.
      await expectValidationErrors(
        await staffApi.patch(`${clientsPath()}/${clientId}`, {client: {e2eCount: 4, e2eLabel: null}}, FAIL),
        [{field: "client.e2eLabel", code: "validation.required"}],
      );
    });

    await test.step("the level `empty` does not stop a value", async () => {
      const clientId = adultClientInfos[3]!.id;
      await staffApi.patch(`${clientsPath()}/${clientId}`, {client: {e2eLegacy: "Still taken"}});
      expect(await clientValues(staffApi, clientId)).toEqual(e2eValues({e2eLegacy: "Still taken"}));
    });
  });

  test("a list of values keeps its order and its repeats", async ({api}) => {
    const {filledClientId, sizeIds} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const lists = {
      e2eTags: ["b", "a", "b", "A"],
      e2eNumbers: [2, 2, 1],
      e2eDays: ["2024-01-02", "2024-01-01", "2024-01-02"],
      e2eSizes: [sizeIds.small, sizeIds.large, sizeIds.small],
    };
    await staffApi.patch(`${clientsPath()}/${filledClientId}`, {client: lists});
    expect(await clientValues(staffApi, filledClientId)).toMatchObject(lists);
    const [row] = await clientRows(
      staffApi,
      Object.keys(lists).flatMap((apiName) => [`client.${apiName}`, `client.${apiName}.count`]),
      {type: "column", column: "id", op: "=", val: filledClientId},
    );
    expect(row).toEqual({
      ...Object.fromEntries(Object.entries(lists).map(([apiName, value]) => [`client.${apiName}`, value])),
      "client.e2eTags.count": 4,
      "client.e2eNumbers.count": 3,
      "client.e2eDays.count": 3,
      "client.e2eSizes.count": 3,
    });
  });

  readOnlyTest("clients are filtered and sorted by the values of each type", async ({api}) => {
    const {sizeIds, filledClientId, requiredOnlyClientId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const ids = async (filter: unknown) => (await clientRows(staffApi, ["id"], filter)).map((row) => row.id);
    const filled = [filledClientId];
    const requiredOnly = [requiredOnlyClientId];
    // Sorted by name: Adam (filled) before Bea (the required values only).
    const both = [filledClientId, requiredOnlyClientId];
    const cases: readonly (readonly [apiName: string, op: string, val: unknown, expected: readonly string[]])[] = [
      ["e2eFlag", "=", true, filled],
      ["e2eFlag", "=", false, []],
      ["e2eDay", "=", "2024-02-29", filled],
      ["e2eDay", ">", "2024-02-29", []],
      ["e2eDay", "<=", "2024-02-29", filled],
      ["e2eMoment", ">=", "2024-03-04T10:30:00Z", filled],
      ["e2eMoment", "<", "2024-03-04T10:30:00Z", []],
      ["e2eCount", "=", 42, filled],
      ["e2eCount", "<", 42, []],
      ["e2eCount", "in", [41, 42], filled],
      ["e2eLabel", "=", "Beta", requiredOnly],
      ["e2eLabel", "%v%", "ET", requiredOnly],
      ["e2eLabel", "v%", "Al", filled],
      ["e2eStory", "%v%", "one\nLine", filled],
      ["e2eSize", "=", sizeIds.small, requiredOnly],
      ["e2eSize", "in", [sizeIds.small, sizeIds.medium], both],
      // A list of texts is searched as a text is, each element on its own.
      ["e2eTags", "lv", "blue", filled],
      ["e2eTags", "%v", "tape", filled],
      ["e2eTags", "v%", "tape", []],
      ["e2eSizes", "has", sizeIds.medium, requiredOnly],
      ["e2eSizes", "has_any", [sizeIds.medium, sizeIds.large], both],
      ["e2eSizes", "has_all", [sizeIds.small, sizeIds.large], filled],
      ["e2eSizes.count", "=", 2, filled],
      ["e2eLegacy", "=", "Old value", filled],
    ];
    for (const [apiName, op, val, expected] of cases) {
      await test.step(`${apiName} ${op} ${JSON.stringify(val).slice(0, 40)}`, async () => {
        expect(await ids(columnFilter(apiName, op, val))).toEqual(expected);
      });
    }

    await test.step("the clients with no value", async () => {
      const all = (await clientRows(staffApi, ["id"])).map((row) => row.id);
      expect(all).toHaveLength(10);
      const notFilled = all.filter((id) => id !== filledClientId);
      for (const apiName of [
        "e2eFlag",
        "e2eDay",
        "e2eMoment",
        "e2eCount",
        "e2eStory",
        "e2eTags",
        "e2eNumbers",
        "e2eDays",
        "e2eLegacy",
      ]) {
        expect(await ids(columnFilter(apiName, "null")), apiName).toEqual(notFilled);
      }
      expect(await ids(columnFilter("e2eTags.count", "=", 0))).toEqual(notFilled);
      expect(await ids(columnFilter("e2eSizes", "null"))).toEqual(
        notFilled.filter((id) => id !== requiredOnlyClientId),
      );
      // "Nothing but" holds for an empty list too.
      expect(await ids(columnFilter("e2eSizes", "has_only", [sizeIds.medium]))).toEqual(notFilled);
    });

    await test.step("what cannot be asked", async () => {
      const refused = async (apiName: string, op: string, val?: unknown) => {
        const res = await staffApi.post(
          `${clientsPath()}/tquery`,
          {columns: [{type: "column", column: "id"}], filter: columnFilter(apiName, op, val), paging: {size: 10}},
          FAIL,
        );
        await expectValidationErrors(res, [{field: "filter.op", code: "validation.in"}]);
      };
      // Lists of numbers and of dates can only be asked whether they are empty.
      await refused("e2eNumbers", "has", 3);
      await refused("e2eDays", "has", "2023-12-24");
      // The column of a required attribute counts as never empty, so the clients from before the
      // attribute, who do lack the value, cannot be asked for.
      await refused("e2eLabel", "null");
      await refused("e2eSize", "null");
    });

    await test.step("sorting", async () => {
      const sortedBy = async (apiName: string, desc: boolean) =>
        (
          await staffApi.tquery<{id: string}>(`${clientsPath()}/tquery`, {
            columns: ["id"],
            filter: {type: "column", column: "id", op: "in", val: both},
            sort: [{column: `client.${apiName}`, desc}],
          })
        ).rows.map((row) => row.id);
      // "Alpha" before "Beta"; the medium position after the small one, by their order.
      expect(await sortedBy("e2eLabel", false)).toEqual(both);
      expect(await sortedBy("e2eLabel", true)).toEqual(both.toReversed());
      expect(await sortedBy("e2eSize", false)).toEqual(both.toReversed());
      expect(await sortedBy("e2eSize", true)).toEqual(both);
    });
  });

  test("attributes referring to users and to attributes take any row of the table", async ({api, globalAdminApi}) => {
    const {facilityId, filledClientId, requiredOnlyClientId, staffUserId, attrIds} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const staffApi = await api.loggedInAs(STAFF);
    const create = async (apiName: string, type: string, extra?: Record<string, unknown>) =>
      createdId(await adminApi.post(`${adminPath()}/attribute`, attributeToCreate(apiName, type, extra)));
    await create("e2eRefUser", "users");
    await create("e2eRefUsers", "users", {isMultiValue: true});
    await create("e2eRefAttribute", "attributes");
    await create("e2eRefClient", "clients");
    const spareAttrId = await create("e2eSpare", "string");
    const listed = (
      await adminApi.getData<readonly {apiName: string; type: string; typeModel: string | null}[]>(
        "system/attribute/list",
      )
    ).filter(({apiName}) => apiName.startsWith("e2eRef"));
    // The type is listed as the model, not as it was given.
    expect(Object.fromEntries(listed.map(({apiName, type, typeModel}) => [apiName, [type, typeModel]]))).toEqual({
      e2eRefUser: ["user", "user"],
      e2eRefUsers: ["user", "user"],
      e2eRefAttribute: ["attribute", "attribute"],
      e2eRefClient: ["client", "client"],
    });

    const path = `${clientsPath()}/${filledClientId}`;
    const refs = {
      e2eRefUser: staffUserId,
      e2eRefUsers: [requiredOnlyClientId, staffUserId],
      e2eRefAttribute: spareAttrId,
    };
    await staffApi.patch(path, {client: refs});
    expect(await clientAttributes(staffApi, facilityId, filledClientId)).toMatchObject(refs);
    const [row] = await clientRows(staffApi, ["client.e2eRefUser", "client.e2eRefUsers", "client.e2eRefAttribute"], {
      type: "column",
      column: "id",
      op: "=",
      val: filledClientId,
    });
    expect(row).toEqual({
      "client.e2eRefUser": staffUserId,
      "client.e2eRefUsers": [requiredOnlyClientId, staffUserId],
      "client.e2eRefAttribute": spareAttrId,
    });

    await test.step("an id of another table is refused", async () => {
      for (const [apiName, value, code, field = apiName] of [
        ["e2eRefUser", attrIds.flag, "validation.exists"],
        ["e2eRefUser", "staff", "validation.uuid"],
        ["e2eRefUsers", [staffUserId, attrIds.flag], "validation.exists", "e2eRefUsers.1"],
        ["e2eRefAttribute", staffUserId, "validation.exists"],
      ] as const) {
        const res = await staffApi.patch(path, {client: {[apiName]: value}}, FAIL);
        await expectValidationErrors(res, [{field: `client.${field}`, code}]);
      }
    });

    await test.step("a user is not checked to be of the facility", async () => {
      const {user} = await globalAdminApi.getData<{user: {id: string}}>("user/status");
      await staffApi.patch(path, {client: {e2eRefUser: user.id}});
      expect(await clientAttributes(staffApi, facilityId, filledClientId)).toMatchObject({e2eRefUser: user.id});
    });

    await test.step("a client attribute wants the id of the clients table, which the API does not give", async () => {
      // A client is known to the API by the id of its user.
      await expectValidationErrors(await staffApi.patch(path, {client: {e2eRefClient: requiredOnlyClientId}}, FAIL), [
        {field: "client.e2eRefClient", code: "validation.exists"},
      ]);
    });

    await test.step("an attribute that a value refers to cannot be deleted", async () => {
      await expectValidationErrors(await adminApi.delete(`${adminPath()}/attribute/${spareAttrId}`, undefined, FAIL), [
        {field: "id", code: "validation.in_use"},
      ]);
      await staffApi.patch(path, {client: {e2eRefAttribute: null}});
      await adminApi.delete(`${adminPath()}/attribute/${spareAttrId}`);
    });
  });

  test("lists of booleans, of times and of long texts are stored", async ({api}) => {
    const {facilityId, filledClientId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const staffApi = await api.loggedInAs(STAFF);
    for (const [apiName, type] of [
      ["e2eFlags", "bool"],
      ["e2eMoments", "datetime"],
      ["e2eStories", "text"],
    ] as const) {
      await adminApi.post(`${adminPath()}/attribute`, attributeToCreate(apiName, type, {isMultiValue: true}));
    }
    const lists = {
      e2eFlags: [true, false, true],
      e2eMoments: ["2024-03-04T10:30:00Z", "2024-03-04T09:00:00Z"],
      e2eStories: ["One\nTwo", "x".repeat(4000)],
    };
    const path = `${clientsPath()}/${filledClientId}`;
    await staffApi.patch(path, {client: lists});
    expect(await clientAttributes(staffApi, facilityId, filledClientId)).toMatchObject(lists);
    // The tquery gives the booleans and the times of a list as the DB has them, unlike those of
    // a single value.
    const [row] = await clientRows(staffApi, ["client.e2eFlags", "client.e2eMoments", "client.e2eStories"], {
      type: "column",
      column: "id",
      op: "=",
      val: filledClientId,
    });
    expect(row).toEqual({
      "client.e2eFlags": [1, 0, 1],
      "client.e2eMoments": ["2024-03-04 10:30:00", "2024-03-04 09:00:00"],
      "client.e2eStories": lists.e2eStories,
    });
    await expectValidationErrors(await staffApi.patch(path, {client: {e2eFlags: [true, "no"]}}, FAIL), [
      {field: "client.e2eFlags.1", code: "validation.boolean"},
    ]);
    await expectValidationErrors(await staffApi.patch(path, {client: {e2eMoments: ["2024-03-04"]}}, FAIL), [
      {field: "client.e2eMoments.0", code: "validation.date_format"},
    ]);
  });

  test("an attribute of another facility is not a field of this facility's clients", async ({api, globalAdminApi}) => {
    const {filledClientId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    const otherFacilityId = await createdId(
      await globalAdminApi.createFacility({name: "Integration Test Other Attributes", url: "int-test-attrs"}),
    );
    const foreign = {...attributeToCreate("e2eForeign", "string"), facilityId: otherFacilityId};
    await globalAdminApi.post("admin/attribute", foreign);

    await expectValidationErrors(
      await staffApi.patch(`${clientsPath()}/${filledClientId}`, {client: {e2eForeign: "x"}}, FAIL),
      [{field: "client", code: "validation.array"}],
    );
    expect(await clientAttributes(staffApi, artifact().facilityId, filledClientId)).not.toHaveProperty("e2eForeign");
    const columns = Object.keys(await columnTypes(staffApi));
    expect(columns).not.toContain("client.e2eForeign");
    expect(columns).toContain("client.e2eLabel");
    const res = await staffApi.post(
      `${clientsPath()}/tquery`,
      {columns: [{type: "column", column: "client.e2eForeign"}], paging: {size: 10}},
      FAIL,
    );
    expect(res.status(), await res.text()).toBe(400);

    await test.step("but its api name is taken for every facility", async () => {
      const adminApi = await api.loggedInAs(ADMIN);
      await expectValidationErrors(
        await adminApi.post(`${adminPath()}/attribute`, attributeToCreate("e2eForeign", "int"), FAIL),
        [{field: "apiName", code: "validation.unique"}],
      );
      await expectValidationErrors(
        await globalAdminApi.post("admin/attribute", {...foreign, apiName: VALUE_ATTRS.label.apiName}, FAIL),
        [{field: "apiName", code: "validation.unique"}],
      );
    });
  });

  test("a required attribute is made optional; a position with values is disabled, not deleted", async ({api}) => {
    const {facilityId, filledClientId, requiredOnlyClientId, sizeIds, attrIds} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const staffApi = await api.loggedInAs(STAFF);
    const columnType = async (apiName: string) => (await columnTypes(staffApi))[`client.${apiName}`];

    await test.step("the level of a required attribute is lowered, for good", async () => {
      expect(await columnType("e2eLabel")).toBe("string");
      await adminApi.patch(`${adminPath()}/attribute/${attrIds.label}`, {requirementLevel: "recommended"});
      await staffApi.patch(`${clientsPath()}/${requiredOnlyClientId}`, {client: {e2eLabel: null}});
      expect(await clientAttributes(staffApi, facilityId, requiredOnlyClientId)).not.toHaveProperty("e2eLabel");
      expect(await columnType("e2eLabel")).toBe("string?");
      await expectValidationErrors(
        await adminApi.patch(`${adminPath()}/attribute/${attrIds.label}`, {requirementLevel: "required"}, FAIL),
        [{field: "requirementLevel", code: "validation.only_on_create"}],
      );
    });

    await test.step("a position that is a value cannot be deleted", async () => {
      // The medium one is the value of the filled client, and in the list of the other.
      await expectValidationErrors(
        await adminApi.delete(`${adminPath()}/position/${sizeIds.medium}`, undefined, FAIL),
        [{field: "id", code: "validation.in_use"}],
      );
    });

    await test.step("disabled, it stays where it is, and can still be given", async () => {
      await adminApi.patch(`${adminPath()}/position/${sizeIds.medium}`, {isDisabled: true});
      expect(await clientAttributes(staffApi, facilityId, filledClientId)).toMatchObject({e2eSize: sizeIds.medium});
      await staffApi.patch(`${clientsPath()}/${requiredOnlyClientId}`, {
        client: {e2eSize: sizeIds.medium, e2eSizes: [sizeIds.medium, sizeIds.large]},
      });
      expect(await clientAttributes(staffApi, facilityId, requiredOnlyClientId)).toMatchObject({
        e2eSize: sizeIds.medium,
        e2eSizes: [sizeIds.medium, sizeIds.large],
      });
    });
  });

  test("positions hold attribute values of each type", async ({api}) => {
    const {sizeDictId, sizeIds} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const create = async (apiName: string, type: string, extra?: Record<string, unknown>) =>
      createdId(
        await adminApi.post(
          `${adminPath()}/attribute`,
          attributeToCreate(apiName, type, {model: "position", ...extra}),
        ),
      );
    await create("e2ePosFlag", "bool");
    await create("e2ePosDay", "date");
    await create("e2ePosCount", "int", {requirementLevel: "recommended"});
    await create("e2ePosNote", "text");
    await create("e2ePosSize", "dict", {dictionaryId: sizeDictId});
    await create("e2ePosTags", "string", {isMultiValue: true});
    const positions = async () =>
      Object.fromEntries(
        (
          await adminApi.list<{positions: readonly Record<string, unknown>[]}>("system/dictionary", sizeDictId)
        )[0]!.positions.map((position) => [
          position.name,
          Object.fromEntries(Object.entries(position).filter(([key]) => key.startsWith("e2ePos"))),
        ]),
      );
    const values = {
      e2ePosFlag: true,
      e2ePosDay: "2024-02-29",
      e2ePosCount: 38,
      e2ePosNote: "Runs\nsmall",
      e2ePosSize: sizeIds.large,
      e2ePosTags: ["s", "xs"],
    };

    await test.step("set on an existing position and on a new one, and cleared", async () => {
      await adminApi.patch(`${adminPath()}/position/${sizeIds.small}`, values);
      const extraLargeId = await createdId(
        await adminApi.post(`${adminPath()}/position`, {
          dictionaryId: sizeDictId,
          name: "+Extra large",
          isDisabled: false,
          e2ePosFlag: false,
          e2ePosCount: 0,
        }),
      );
      expect(await positions()).toEqual({
        "+Small": values,
        "+Medium": {},
        "+Large": {},
        "+Extra large": {e2ePosFlag: false, e2ePosCount: 0},
      });
      await adminApi.patch(`${adminPath()}/position/${extraLargeId}`, {e2ePosFlag: null, e2ePosCount: null});
      await adminApi.patch(`${adminPath()}/position/${sizeIds.small}`, {e2ePosTags: [], e2ePosNote: null});
      const {e2ePosTags: _tags, e2ePosNote: _note, ...kept} = values;
      expect(await positions()).toEqual({"+Small": kept, "+Medium": {}, "+Large": {}, "+Extra large": {}});
    });

    await test.step("values of the wrong type are refused", async () => {
      const {gender} = await adminApi.dictionaries();
      for (const [apiName, value, code, field = apiName] of [
        ["e2ePosFlag", "yes", "validation.boolean"],
        ["e2ePosDay", "2024-02-30", "validation.date_format"],
        ["e2ePosCount", "38", "validation.custom.data_type"],
        ["e2ePosNote", "x".repeat(4001), "validation.max.string"],
        ["e2ePosSize", gender!.male!, "validation.custom.position_in_dictionary"],
        ["e2ePosTags", "s", "validation.array"],
        ["e2ePosTags", ["s", 1], "validation.string", "e2ePosTags.1"],
      ] as const) {
        const res = await adminApi.patch(`${adminPath()}/position/${sizeIds.medium}`, {[apiName]: value}, FAIL);
        await expectValidationErrors(res, [{field, code}]);
      }
    });

    await test.step("a required attribute is required of the new positions of every dictionary", async () => {
      await create("e2ePosCode", "string", {requirementLevel: "required"});
      const position = {dictionaryId: sizeDictId, name: "+Tiny", isDisabled: false};
      await expectValidationErrors(await adminApi.post(`${adminPath()}/position`, position, FAIL), [
        {field: "e2ePosCode", code: "validation.present"},
      ]);
      await adminApi.post(`${adminPath()}/position`, {...position, e2ePosCode: "XXS"});
      const meetingType = {
        dictionaryId: await adminApi.dictionaryId("meetingType"),
        name: "+E2E coded type",
        isDisabled: false,
        categoryDictId: (await adminApi.dictionaries()).meetingCategory!.other!,
        durationMinutes: 30,
      };
      await expectValidationErrors(await adminApi.post(`${adminPath()}/position`, meetingType, FAIL), [
        {field: "e2ePosCode", code: "validation.present"},
      ]);
      // The positions from before it are changed without it.
      await adminApi.patch(`${adminPath()}/position/${sizeIds.large}`, {e2ePosCount: 44});
      expect((await positions())["+Large"]).toEqual({e2ePosCount: 44});
    });
  });
});
