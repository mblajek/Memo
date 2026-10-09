import {ADMIN, BARE_MEMBER, STAFF} from "../lib/layers/facility.ts";
import {
  COLOUR_DICT_NAME,
  COLOUR_NAMES,
  COLOURS_ATTR,
  EMPTY_DICT_NAME,
  NICKNAME_ATTR,
  OTHER_DICT_NAME,
  TAGGED_CLIENT_NICKNAME,
  technicalsLayer,
} from "../lib/layers/technicals.ts";
import {createdId, expectValidationError, expectValidationErrors} from "../lib/responses.ts";
import {MemoAPI, expect, readOnlyTest, test} from "../lib/test.ts";
import {attributeToCreate, clientAttributes} from "../helpers/queries.ts";

/**
 * API-level tests of the dictionary / position / attribute administration: the facility admin
 * endpoints (`facility/{id}/admin/…`), the global admin ones (`admin/…`), and how the custom
 * attributes show up on clients.
 */

interface PositionRes {
  readonly id: string;
  readonly name: string;
  readonly facilityId: string | null;
  readonly isFixed: boolean;
  readonly isDisabled: boolean;
  readonly defaultOrder: number;
  readonly [attribute: string]: unknown;
}

interface DictionaryRes {
  readonly id: string;
  readonly name: string;
  readonly facilityId: string | null;
  readonly isFixed: boolean;
  readonly isExtendable: boolean;
  readonly positionRequiredAttributeIds?: readonly string[] | null;
  readonly positions: readonly PositionRes[];
}

interface AttributeRes {
  readonly id: string;
  readonly name: string;
  readonly facilityId: string | null;
  readonly model: string;
  readonly apiName: string;
  readonly type: string;
  readonly dictionaryId: string | null;
  readonly isFixed: boolean;
  readonly isMultiValue: boolean | null;
  readonly defaultOrder: number;
  readonly requirementLevel: string;
  readonly description: string | null;
}

async function allDictionaries(api: MemoAPI) {
  return await api.getData<readonly DictionaryRes[]>("system/dictionary/list");
}

async function getDictionary(api: MemoAPI, id: string) {
  const data = await api.list<DictionaryRes>(`system/dictionary`, id);
  expect(data).toHaveLength(1);
  return data[0]!;
}

async function findDictionary(api: MemoAPI, id: string) {
  return (await allDictionaries(api)).find((d) => d.id === id);
}

/** The names of the dictionary's positions, in the default order. */
async function positionNames(api: MemoAPI, dictionaryId: string) {
  const {positions} = await getDictionary(api, dictionaryId);
  // The order values of the managed positions are a contiguous sequence starting at 1.
  expect(positions.map((p) => p.defaultOrder)).toEqual(positions.map((_p, i) => i + 1));
  return positions.map((p) => p.name);
}

async function allAttributes(api: MemoAPI) {
  return await api.getData<readonly AttributeRes[]>("system/attribute/list");
}

async function findAttribute(api: MemoAPI, id: string) {
  return (await allAttributes(api)).find((a) => a.id === id);
}

function stringClientAttribute(apiName: string, extra: Record<string, unknown> = {}) {
  return attributeToCreate(apiName, "string", extra);
}

const FAIL = {allowFailure: true} as const;

technicalsLayer.describe((artifact) => {
  const adminPath = () => `facility/${artifact().facilityId}/admin`;

  readOnlyTest("the seeded dictionaries and attributes are listed with their scope and order", async ({api}) => {
    const {facilityId, colourDictId, colourIds, coloursAttrId, nicknameAttrId, otherFacilityId, otherDictId} =
      artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const colours = await getDictionary(adminApi, colourDictId);
    expect(colours).toMatchObject({name: COLOUR_DICT_NAME, facilityId, isFixed: false, isExtendable: true});
    expect(
      colours.positions.map(({id, name, facilityId, isFixed, isDisabled, defaultOrder}) => ({
        id,
        name,
        facilityId,
        isFixed,
        isDisabled,
        defaultOrder,
      })),
    ).toEqual(
      [colourIds.red, colourIds.green, colourIds.blue].map((id, i) => ({
        id,
        name: COLOUR_NAMES[i],
        facilityId,
        isFixed: false,
        isDisabled: false,
        defaultOrder: i + 1,
      })),
    );
    expect(await getDictionary(adminApi, otherDictId)).toMatchObject({
      name: OTHER_DICT_NAME,
      facilityId: otherFacilityId,
    });
    expect(await findAttribute(adminApi, coloursAttrId)).toMatchObject({
      ...COLOURS_ATTR,
      facilityId,
      model: "client",
      type: "dict",
      dictionaryId: colourDictId,
      isFixed: false,
      isMultiValue: true,
      requirementLevel: "optional",
    });
    expect(await findAttribute(adminApi, nicknameAttrId)).toMatchObject({
      ...NICKNAME_ATTR,
      facilityId,
      type: "string",
      dictionaryId: null,
      isMultiValue: false,
    });
  });

  // Pinned as it is, not as it should be: the two lists need no login, and hold what every facility
  // has defined.
  readOnlyTest(
    "the lists of dictionaries and of attributes are given to anyone, with those of every facility",
    async ({api}) => {
      const {colourDictId, otherDictId, otherPositionId, nicknameAttrId} = artifact();
      expect((await api.get("user/status", FAIL)).status()).toBe(401);
      const dictionaries = await allDictionaries(api);
      expect(dictionaries.find(({id}) => id === colourDictId)?.positions.map(({name}) => name)).toEqual([
        ...COLOUR_NAMES,
      ]);
      expect(dictionaries.find(({id}) => id === otherDictId)).toMatchObject({
        name: OTHER_DICT_NAME,
        positions: [expect.objectContaining({id: otherPositionId})],
      });
      expect(await findAttribute(api, nicknameAttrId)).toMatchObject(NICKNAME_ATTR);
      // The table queries of the same data, and the list of the facilities, do need a login.
      for (const path of [
        "system/dictionary/tquery",
        "system/attribute/tquery",
        "system/position/tquery",
        "system/facility/list",
      ]) {
        expect((await api.get(path, FAIL)).status(), path).toBe(401);
      }
    },
  );

  readOnlyTest("technicals tquery endpoints return the seeded rows", async ({api}) => {
    const {facilityId, colourDictId, coloursAttrId, nicknameAttrId, unusedAttrId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    await test.step("dictionaries of the facility", async () => {
      const {rows} = await adminApi.tquery("system/dictionary/tquery", {
        columns: ["name", "positions.count"],
        filter: {type: "column", column: "facility.id", op: "=", val: facilityId},
        sort: [{column: "name"}],
      });
      expect(rows).toEqual([
        {"name": COLOUR_DICT_NAME, "positions.count": 3},
        {"name": EMPTY_DICT_NAME, "positions.count": 0},
      ]);
    });
    await test.step("positions of one dictionary, in the default order", async () => {
      const {rows} = await adminApi.tquery("system/position/tquery", {
        columns: ["name", "defaultOrder"],
        filter: {type: "column", column: "dictionary.id", op: "=", val: colourDictId},
        sort: [{column: "defaultOrder"}],
      });
      expect(rows).toEqual(COLOUR_NAMES.map((name, i) => ({name, defaultOrder: i + 1})));
    });
    await test.step("attributes of the facility", async () => {
      const {rows} = await adminApi.tquery<{id: string}>("system/attribute/tquery", {
        columns: ["id", "table", "type"],
        filter: {type: "column", column: "facility.id", op: "=", val: facilityId},
        sort: [{column: "defaultOrder"}],
      });
      expect(rows.map((row) => row.id)).toEqual([coloursAttrId, nicknameAttrId, unusedAttrId]);
    });
  });

  readOnlyTest("technicals admin endpoints are closed to non-admins", async ({api}) => {
    const {facilityId, colourDictId, colourIds, unusedAttrId, emptyDictId} = artifact();
    const attempts = (base: string) =>
      [
        ["post", `${base}/dictionary`, {name: "+Nope"}],
        ["patch", `${base}/dictionary/${emptyDictId}`, {name: "+Nope"}],
        ["delete", `${base}/dictionary/${emptyDictId}`, undefined],
        ["post", `${base}/position`, {dictionaryId: colourDictId, name: "+Nope", isDisabled: false}],
        ["patch", `${base}/position/${colourIds.blue}`, {name: "+Nope"}],
        ["delete", `${base}/position/${colourIds.blue}`, undefined],
        ["post", `${base}/attribute`, stringClientAttribute("e2eNope")],
        ["patch", `${base}/attribute/${unusedAttrId}`, {name: "+Nope"}],
        ["delete", `${base}/attribute/${unusedAttrId}`, undefined],
      ] as const;
    async function expectAll(userApi: MemoAPI, base: string, status: number) {
      for (const [method, path, data] of attempts(base)) {
        const res = await userApi[method](path, data, FAIL);
        expect(res.status(), `${method} ${path}`).toBe(status);
      }
    }
    await test.step("staff and bare member on the facility admin endpoints", async () => {
      await expectAll(await api.loggedInAs(STAFF), `facility/${facilityId}/admin`, 403);
      await expectAll(await api.loggedInAs(BARE_MEMBER), `facility/${facilityId}/admin`, 403);
    });
    await test.step("facility admin on the global admin endpoints", async () => {
      await expectAll(await api.loggedInAs(ADMIN), "admin", 403);
    });
    await test.step("not logged in", async () => {
      await expectAll(api, `facility/${facilityId}/admin`, 401);
      await expectAll(api, "admin", 401);
    });
    await test.step("nothing changed", async () => {
      const adminApi = await api.loggedInAs(ADMIN);
      expect(await positionNames(adminApi, colourDictId)).toEqual([...COLOUR_NAMES]);
      expect((await getDictionary(adminApi, emptyDictId)).name).toBe(EMPTY_DICT_NAME);
      expect(await findAttribute(adminApi, unusedAttrId)).toBeDefined();
    });
  });

  test("facility admin creates, renames and deletes a dictionary", async ({api}) => {
    const {facilityId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const id = await createdId(await adminApi.post(`${adminPath()}/dictionary`, {name: "+E2E Sizes"}));
    // The facility endpoint forces the scope and the flags.
    expect(await getDictionary(adminApi, id)).toMatchObject({
      name: "+E2E Sizes",
      facilityId,
      isFixed: false,
      isExtendable: true,
      positions: [],
    });
    await adminApi.patch(`${adminPath()}/dictionary/${id}`, {name: "+E2E Shoe sizes"});
    expect((await getDictionary(adminApi, id)).name).toBe("+E2E Shoe sizes");
    await adminApi.delete(`${adminPath()}/dictionary/${id}`);
    expect(await findDictionary(adminApi, id)).toBeUndefined();
  });

  readOnlyTest("dictionary names are unique within the facility's visibility scope", async ({api}) => {
    const {emptyDictId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const unique = {field: "name", code: "validation.unique"};
    await expectValidationError(
      await adminApi.post(`${adminPath()}/dictionary`, {name: COLOUR_DICT_NAME}, FAIL),
      unique,
    );
    // "gender" is a global (fixed) dictionary.
    await expectValidationError(await adminApi.post(`${adminPath()}/dictionary`, {name: "gender"}, FAIL), unique);
    await expectValidationError(
      await adminApi.patch(`${adminPath()}/dictionary/${emptyDictId}`, {name: COLOUR_DICT_NAME}, FAIL),
      unique,
    );
    // A bare "+" would be an empty literal name.
    await expectValidationError(await adminApi.post(`${adminPath()}/dictionary`, {name: "+"}, FAIL), {
      field: "name",
      code: "validation.not_in",
    });
    // Renaming to the current name is not a conflict.
    await adminApi.patch(`${adminPath()}/dictionary/${emptyDictId}`, {name: EMPTY_DICT_NAME});
  });

  test("a dictionary name may repeat the name of another facility's dictionary", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const id = await createdId(await adminApi.post(`${adminPath()}/dictionary`, {name: OTHER_DICT_NAME}));
    expect((await getDictionary(adminApi, id)).facilityId).toBe(artifact().facilityId);
  });

  readOnlyTest("a dictionary with positions or used by an attribute cannot be deleted", async ({api}) => {
    const {colourDictId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    await expectValidationError(await adminApi.delete(`${adminPath()}/dictionary/${colourDictId}`, undefined, FAIL), {
      field: "id",
      code: "validation.in_use",
    });
    expect(await positionNames(adminApi, colourDictId)).toEqual([...COLOUR_NAMES]);
  });

  test("a dictionary used only by an attribute cannot be deleted until the attribute is gone", async ({api}) => {
    const {emptyDictId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const attributeId = await createdId(
      await adminApi.post(
        `${adminPath()}/attribute`,
        stringClientAttribute("e2eShape", {type: "dict", dictionaryId: emptyDictId}),
      ),
    );
    await expectValidationError(await adminApi.delete(`${adminPath()}/dictionary/${emptyDictId}`, undefined, FAIL), {
      field: "id",
      code: "validation.in_use",
    });
    await adminApi.delete(`${adminPath()}/attribute/${attributeId}`);
    await adminApi.delete(`${adminPath()}/dictionary/${emptyDictId}`);
    expect(await findDictionary(adminApi, emptyDictId)).toBeUndefined();
  });

  readOnlyTest("facility admin cannot touch global or other facilities' technicals", async ({api}) => {
    const {otherDictId, otherPositionId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const dicts = await adminApi.dictionaries();
    const genderDictId = await adminApi.dictionaryId("gender");
    const fixedClientAttribute = (await allAttributes(adminApi)).find((a) => a.model === "client" && a.isFixed)!;
    for (const [method, path] of [
      ["patch", `dictionary/${genderDictId}`],
      ["delete", `dictionary/${genderDictId}`],
      ["patch", `dictionary/${otherDictId}`],
      ["delete", `dictionary/${otherDictId}`],
      ["patch", `position/${dicts.gender!.male!}`],
      ["delete", `position/${dicts.gender!.male!}`],
      ["patch", `position/${otherPositionId}`],
      ["delete", `position/${otherPositionId}`],
      ["patch", `attribute/${fixedClientAttribute.id}`],
      ["delete", `attribute/${fixedClientAttribute.id}`],
    ] as const) {
      const res = await adminApi[method](
        `${adminPath()}/${path}`,
        method === "patch" ? {name: "+Hijacked"} : undefined,
        FAIL,
      );
      expect(res.status(), `${method} ${path}`).toBe(404);
    }
    expect((await getDictionary(adminApi, otherDictId)).name).toBe(OTHER_DICT_NAME);
  });

  readOnlyTest("fixed technicals are not editable even by the global admin", async ({globalAdminApi}) => {
    const dicts = await globalAdminApi.dictionaries();
    const genderDictId = await globalAdminApi.dictionaryId("gender");
    const fixedClientAttribute = (await allAttributes(globalAdminApi)).find((a) => a.model === "client" && a.isFixed)!;
    const notEditable = {field: "id", code: "validation.not_editable"};
    for (const path of [
      `dictionary/${genderDictId}`,
      `position/${dicts.gender!.male!}`,
      `attribute/${fixedClientAttribute.id}`,
    ]) {
      await expectValidationError(await globalAdminApi.patch(`admin/${path}`, {name: "+Hijacked"}, FAIL), notEditable);
      await expectValidationError(await globalAdminApi.delete(`admin/${path}`, undefined, FAIL), notEditable);
    }
    // The fixed flag itself cannot be set through the API.
    await expectValidationError(
      await globalAdminApi.post(
        "admin/dictionary",
        {facilityId: null, name: "+Fixed", isExtendable: true, isFixed: true},
        FAIL,
      ),
      {field: "isFixed", code: "validation.declined"},
    );
  });

  test("new positions are appended, or inserted at the requested order", async ({api}) => {
    const {colourDictId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const position = (name: string, extra: Record<string, unknown> = {}) => ({
      dictionaryId: colourDictId,
      name,
      isDisabled: false,
      ...extra,
    });
    await adminApi.post(`${adminPath()}/position`, position("+Yellow"));
    expect(await positionNames(adminApi, colourDictId)).toEqual([...COLOUR_NAMES, "+Yellow"]);
    await adminApi.post(`${adminPath()}/position`, position("+Black", {defaultOrder: 2}));
    expect(await positionNames(adminApi, colourDictId)).toEqual(["+Red", "+Black", "+Green", "+Blue", "+Yellow"]);
    // An order past the end is clamped to an append.
    await adminApi.post(`${adminPath()}/position`, position("+White", {defaultOrder: 100, isDisabled: true}));
    expect(await positionNames(adminApi, colourDictId)).toEqual([
      "+Red",
      "+Black",
      "+Green",
      "+Blue",
      "+Yellow",
      "+White",
    ]);
    expect((await getDictionary(adminApi, colourDictId)).positions.at(-1)!.isDisabled).toBe(true);
    await expectValidationError(
      await adminApi.post(`${adminPath()}/position`, position("+Zero", {defaultOrder: 0}), FAIL),
      {
        field: "defaultOrder",
        code: "validation.min.numeric",
      },
    );
  });

  test("patching a position renames, disables and reorders it", async ({api}) => {
    const {colourDictId, colourIds} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    await adminApi.patch(`${adminPath()}/position/${colourIds.blue}`, {name: "+Navy", isDisabled: true});
    expect((await getDictionary(adminApi, colourDictId)).positions[2]).toMatchObject({
      id: colourIds.blue,
      name: "+Navy",
      isDisabled: true,
    });
    await test.step("move up", async () => {
      await adminApi.patch(`${adminPath()}/position/${colourIds.blue}`, {defaultOrder: 1});
      expect(await positionNames(adminApi, colourDictId)).toEqual(["+Navy", "+Red", "+Green"]);
    });
    await test.step("move down", async () => {
      await adminApi.patch(`${adminPath()}/position/${colourIds.blue}`, {defaultOrder: 2});
      expect(await positionNames(adminApi, colourDictId)).toEqual(["+Red", "+Navy", "+Green"]);
    });
    await test.step("an order past the end moves to the end", async () => {
      await adminApi.patch(`${adminPath()}/position/${colourIds.red}`, {defaultOrder: 50});
      expect(await positionNames(adminApi, colourDictId)).toEqual(["+Navy", "+Green", "+Red"]);
    });
    await test.step("the dictionary of a position is immutable", async () => {
      await expectValidationError(
        await adminApi.patch(`${adminPath()}/position/${colourIds.red}`, {dictionaryId: artifact().emptyDictId}, FAIL),
        {field: "dictionaryId", code: "validation.missing"},
      );
    });
  });

  test("deleting a position closes the gap in the order; a referenced one cannot be deleted", async ({api}) => {
    const {facilityId, colourDictId, colourIds, taggedClientId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    // Red is the value of a client's attribute.
    await expectValidationError(await adminApi.delete(`${adminPath()}/position/${colourIds.red}`, undefined, FAIL), {
      field: "id",
      code: "validation.in_use",
    });
    await adminApi.delete(`${adminPath()}/position/${colourIds.green}`);
    expect(await positionNames(adminApi, colourDictId)).toEqual(["+Red", "+Blue"]);
    // Once no client refers to it, red can go too.
    await adminApi.patch(`facility/${facilityId}/user/client/${taggedClientId}`, {
      client: {[COLOURS_ATTR.apiName]: []},
    });
    await adminApi.delete(`${adminPath()}/position/${colourIds.red}`);
    expect(await positionNames(adminApi, colourDictId)).toEqual(["+Blue"]);
  });

  readOnlyTest("a position cannot be added to a non-extendable or a foreign dictionary", async ({api}) => {
    const {otherDictId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const nonExtendable = (await allDictionaries(adminApi)).find((d) => d.facilityId === null && !d.isExtendable)!;
    expect(nonExtendable, "a global non-extendable dictionary").toBeDefined();
    const position = (dictionaryId: string) => ({dictionaryId, name: "+Intruder", isDisabled: false});
    await expectValidationError(await adminApi.post(`${adminPath()}/position`, position(nonExtendable.id), FAIL), {
      field: "dictionaryId",
      code: "validation.not_extendable",
    });
    await expectValidationError(await adminApi.post(`${adminPath()}/position`, position(otherDictId), FAIL), {
      field: "dictionaryId",
      code: "validation.different_facility",
    });
    await expectValidationError(
      await adminApi.post(`${adminPath()}/position`, position("3f2504e0-4f89-41d3-9a0c-0305e82c3301"), FAIL),
      {field: "dictionaryId", code: "validation.exists"},
    );
    await expectValidationError(
      await adminApi.post(`${adminPath()}/position`, {dictionaryId: artifact().colourDictId, isDisabled: false}, FAIL),
      {field: "name", code: "validation.present"},
    );
  });

  test("facility admin creates attributes; api names are validated", async ({api}) => {
    const {facilityId, colourDictId, otherDictId, unusedAttrId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const post = (data: unknown) => adminApi.post(`${adminPath()}/attribute`, data, FAIL);
    const id = await createdId(
      await adminApi.post(
        `${adminPath()}/attribute`,
        stringClientAttribute("e2eShoeSize", {type: "int", description: "EU size", requirementLevel: "recommended"}),
      ),
    );
    const lastOrder = (await findAttribute(adminApi, unusedAttrId))!.defaultOrder;
    expect(await findAttribute(adminApi, id)).toMatchObject({
      facilityId,
      model: "client",
      name: "+e2eShoeSize",
      apiName: "e2eShoeSize",
      type: "int",
      isFixed: false,
      isMultiValue: false,
      requirementLevel: "recommended",
      description: "EU size",
      defaultOrder: lastOrder + 1,
    });
    await expectValidationError(await post(stringClientAttribute("e2eShoeSize")), {
      field: "apiName",
      code: "validation.unique",
    });
    // The name of a physical column of the clients table.
    await expectValidationError(await post(stringClientAttribute("notes")), {
      field: "apiName",
      code: "validation.reserved",
    });
    await expectValidationError(await post(stringClientAttribute("E2eCapital")), {
      field: "apiName",
      code: "validation.regex",
    });
    await expectValidationError(await post(stringClientAttribute("e2eNoDict", {type: "dict"})), {
      field: "dictionaryId",
      code: "validation.required_for_dict_type",
    });
    await expectValidationError(await post(stringClientAttribute("e2eStrDict", {dictionaryId: colourDictId})), {
      field: "dictionaryId",
      code: "validation.required_for_dict_type",
    });
    await expectValidationError(
      await post(stringClientAttribute("e2eForeignDict", {type: "dict", dictionaryId: otherDictId})),
      {field: "dictionaryId", code: "validation.different_facility"},
    );
    // Only clients, dictionaries and positions can carry custom attributes.
    await expectValidationError(await post(stringClientAttribute("e2eMeeting", {model: "meeting"})), {
      field: "model",
      code: "validation.in",
    });
    await expectValidationError(await post(stringClientAttribute("e2eStaff", {model: "staffMember"})), {
      field: "model",
      code: "validation.in",
    });
    // A dict attribute over a global dictionary is fine.
    const genderDictId = await adminApi.dictionaryId("gender");
    await adminApi.post(
      `${adminPath()}/attribute`,
      stringClientAttribute("e2eSecondGender", {type: "dict", dictionaryId: genderDictId}),
    );
  });

  test("patching an attribute: editable and immutable fields, requirement level, order", async ({api}) => {
    const {coloursAttrId, nicknameAttrId, unusedAttrId, emptyDictId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const patch = (data: unknown) => adminApi.patch(`${adminPath()}/attribute/${unusedAttrId}`, data, FAIL);
    await adminApi.patch(`${adminPath()}/attribute/${unusedAttrId}`, {
      name: "+E2E renamed",
      apiName: "e2eRenamed",
      description: "Now described",
      requirementLevel: "recommended",
    });
    expect(await findAttribute(adminApi, unusedAttrId)).toMatchObject({
      name: "+E2E renamed",
      apiName: "e2eRenamed",
      description: "Now described",
      requirementLevel: "recommended",
    });
    for (const [field, value] of [
      ["type", "int"],
      ["model", "position"],
      ["dictionaryId", emptyDictId],
      ["isMultiValue", true],
    ] as const) {
      await expectValidationError(await patch({[field]: value}), {field, code: "validation.missing"});
    }
    // Existing rows could silently violate a requirement introduced later.
    await expectValidationError(await patch({requirementLevel: "required"}), {
      field: "requirementLevel",
      code: "validation.only_on_create",
    });
    await expectValidationError(await patch({apiName: NICKNAME_ATTR.apiName}), {
      field: "apiName",
      code: "validation.unique",
    });
    await test.step("reorder", async () => {
      const facilityAttributeIds = async () =>
        (await allAttributes(adminApi))
          .filter((a) => a.facilityId === artifact().facilityId)
          .toSorted((a, b) => a.defaultOrder - b.defaultOrder)
          .map((a) => a.id);
      // The orders are shared by all the client attributes, also the global ones.
      const clientOrders = async () =>
        (await allAttributes(adminApi))
          .filter((a) => a.model === "client")
          .map((a) => a.defaultOrder)
          .toSorted((a, b) => a - b);
      const ordersBefore = await clientOrders();
      expect(await facilityAttributeIds()).toEqual([coloursAttrId, nicknameAttrId, unusedAttrId]);
      const coloursOrder = (await findAttribute(adminApi, coloursAttrId))!.defaultOrder;
      await adminApi.patch(`${adminPath()}/attribute/${unusedAttrId}`, {defaultOrder: coloursOrder});
      expect(await facilityAttributeIds()).toEqual([unusedAttrId, coloursAttrId, nicknameAttrId]);
      expect(await clientOrders()).toEqual(ordersBefore);
    });
  });

  test("an attribute with values cannot be deleted; an unused one can", async ({api}) => {
    const {facilityId, nicknameAttrId, unusedAttrId, taggedClientId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const inUse = {field: "id", code: "validation.in_use"};
    await expectValidationError(
      await adminApi.delete(`${adminPath()}/attribute/${nicknameAttrId}`, undefined, FAIL),
      inUse,
    );
    await adminApi.delete(`${adminPath()}/attribute/${unusedAttrId}`);
    expect(await findAttribute(adminApi, unusedAttrId)).toBeUndefined();
    // Clearing the only value frees the attribute.
    await adminApi.patch(`facility/${facilityId}/user/client/${taggedClientId}`, {
      client: {[NICKNAME_ATTR.apiName]: null},
    });
    await adminApi.delete(`${adminPath()}/attribute/${nicknameAttrId}`);
    expect(await findAttribute(adminApi, nicknameAttrId)).toBeUndefined();
    expect(await clientAttributes(adminApi, facilityId, taggedClientId)).not.toHaveProperty(NICKNAME_ATTR.apiName);
  });

  test("custom attribute values are stored on a client and validated", async ({api}) => {
    const {facilityId, colourIds, taggedClientId, adultClientInfos, otherPositionId} = artifact();
    const staffApi = await api.loggedInAs(STAFF);
    expect(await clientAttributes(staffApi, facilityId, taggedClientId)).toMatchObject({
      [COLOURS_ATTR.apiName]: [colourIds.red],
      [NICKNAME_ATTR.apiName]: TAGGED_CLIENT_NICKNAME,
    });
    const otherClientId = adultClientInfos[1]!.id;
    const clientPath = `facility/${facilityId}/user/client/${otherClientId}`;
    await staffApi.patch(clientPath, {
      client: {[COLOURS_ATTR.apiName]: [colourIds.green, colourIds.blue], [NICKNAME_ATTR.apiName]: "Bee"},
    });
    expect(await clientAttributes(staffApi, facilityId, otherClientId)).toMatchObject({
      [COLOURS_ATTR.apiName]: [colourIds.green, colourIds.blue],
      [NICKNAME_ATTR.apiName]: "Bee",
    });
    await test.step("a position of another dictionary is rejected", async () => {
      const res = await staffApi.patch(clientPath, {client: {[COLOURS_ATTR.apiName]: [otherPositionId]}}, FAIL);
      await expectValidationErrors(res, [
        {field: `client.${COLOURS_ATTR.apiName}.0`, code: "validation.custom.position_in_dictionary"},
      ]);
      const dicts = await staffApi.dictionaries();
      const res2 = await staffApi.patch(clientPath, {client: {[COLOURS_ATTR.apiName]: [dicts.gender!.male!]}}, FAIL);
      await expectValidationErrors(res2, [
        {field: `client.${COLOURS_ATTR.apiName}.0`, code: "validation.custom.position_in_dictionary"},
      ]);
    });
    await test.step("a multi-value attribute does not take a scalar", async () => {
      const res = await staffApi.patch(clientPath, {client: {[COLOURS_ATTR.apiName]: colourIds.red}}, FAIL);
      await expectValidationErrors(res, [{field: `client.${COLOURS_ATTR.apiName}`, code: "validation.array"}]);
    });
    expect(await clientAttributes(staffApi, facilityId, otherClientId)).toMatchObject({
      [COLOURS_ATTR.apiName]: [colourIds.green, colourIds.blue],
    });
    await test.step("the values are filterable through the clients tquery", async () => {
      const data = (
        await staffApi.tquery<{id: string}>(`facility/${facilityId}/user/client/tquery`, {
          columns: ["id"],
          filter: {type: "column", column: `client.${COLOURS_ATTR.apiName}`, op: "has", val: colourIds.green},
        })
      ).rows;
      expect(data.map((row) => row.id)).toEqual([otherClientId]);
    });
  });

  test("a dictionary can require an attribute on its positions", async ({api}) => {
    const {colourDictId, colourIds} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const hexAttrId = await createdId(
      await adminApi.post(`${adminPath()}/attribute`, stringClientAttribute("e2eHex", {model: "position"})),
    );
    const dictPath = `${adminPath()}/dictionary/${colourDictId}`;
    const requireHex = {positionRequiredAttributeIds: [hexAttrId]};
    await test.step("not while some positions lack the value", async () => {
      await adminApi.patch(`${adminPath()}/position/${colourIds.red}`, {e2eHex: "#f00"});
      await expectValidationError(await adminApi.patch(dictPath, requireHex, FAIL), {
        field: "positionRequiredAttributeIds",
        code: "validation.missing_on_positions",
      });
      expect((await getDictionary(adminApi, colourDictId)).positionRequiredAttributeIds ?? []).toEqual([]);
    });
    await test.step("once every position has it", async () => {
      await adminApi.patch(`${adminPath()}/position/${colourIds.green}`, {e2eHex: "#0f0"});
      await adminApi.patch(`${adminPath()}/position/${colourIds.blue}`, {e2eHex: "#00f"});
      await adminApi.patch(dictPath, requireHex);
      const dictionary = await getDictionary(adminApi, colourDictId);
      expect(dictionary.positionRequiredAttributeIds).toEqual([hexAttrId]);
      expect(dictionary.positions.map((p) => p.e2eHex)).toEqual(["#f00", "#0f0", "#00f"]);
    });
    await test.step("the value is then required on the positions", async () => {
      const position = {dictionaryId: colourDictId, name: "+Yellow", isDisabled: false};
      const required = {field: "e2eHex", code: "validation.required"};
      await expectValidationError(await adminApi.post(`${adminPath()}/position`, position, FAIL), required);
      await expectValidationError(
        await adminApi.patch(`${adminPath()}/position/${colourIds.red}`, {e2eHex: null}, FAIL),
        required,
      );
      await adminApi.post(`${adminPath()}/position`, {...position, e2eHex: "#ff0"});
      // An edit not touching the required attribute goes through.
      await adminApi.patch(`${adminPath()}/position/${colourIds.red}`, {name: "+Crimson"});
      expect(await positionNames(adminApi, colourDictId)).toEqual(["+Crimson", "+Green", "+Blue", "+Yellow"]);
    });
    await test.step("and the attribute cannot be deleted", async () => {
      await expectValidationError(await adminApi.delete(`${adminPath()}/attribute/${hexAttrId}`, undefined, FAIL), {
        field: "id",
        code: "validation.in_use",
      });
    });
    await test.step("only position attributes of the same scope can be required", async () => {
      await expectValidationError(
        await adminApi.patch(dictPath, {positionRequiredAttributeIds: [artifact().nicknameAttrId]}, FAIL),
        {field: "positionRequiredAttributeIds", code: "validation.exists"},
      );
      const unknown = await adminApi.patch(
        dictPath,
        {positionRequiredAttributeIds: ["3f2504e0-4f89-41d3-9a0c-0305e82c3301"]},
        FAIL,
      );
      expect(unknown.status(), await unknown.text()).toBe(400);
    });
  });

  test("global admin manages a global dictionary that facilities extend", async ({api, globalAdminApi}) => {
    const {facilityId, otherFacilityId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const dictId = await createdId(
      await globalAdminApi.post("admin/dictionary", {facilityId: null, name: "+E2E Global", isExtendable: true}),
    );
    expect(await getDictionary(adminApi, dictId)).toMatchObject({facilityId: null, isFixed: false, isExtendable: true});
    const globalPosition = {facilityId: null, dictionaryId: dictId, name: "+Global option", isDisabled: false};
    const globalPositionId = await createdId(await globalAdminApi.post("admin/position", globalPosition));
    const facilityPosition = {dictionaryId: dictId, name: "+Facility option", isDisabled: false};
    await test.step("a non-extendable dictionary takes no positions, also not from the global admin", async () => {
      await globalAdminApi.patch(`admin/dictionary/${dictId}`, {isExtendable: false});
      const notExtendable = {field: "dictionaryId", code: "validation.not_extendable"};
      await expectValidationError(
        await adminApi.post(`${adminPath()}/position`, facilityPosition, FAIL),
        notExtendable,
      );
      await expectValidationError(
        await globalAdminApi.post("admin/position", {...globalPosition, name: "+Second"}, FAIL),
        notExtendable,
      );
    });
    await test.step("once extendable, a facility adds its own position", async () => {
      await globalAdminApi.patch(`admin/dictionary/${dictId}`, {isExtendable: true});
      const facilityPositionId = await createdId(await adminApi.post(`${adminPath()}/position`, facilityPosition));
      const {positions} = await getDictionary(adminApi, dictId);
      expect(positions.map(({id, facilityId}) => ({id, facilityId}))).toEqual([
        {id: globalPositionId, facilityId: null},
        {id: facilityPositionId, facilityId},
      ]);
      // The facility admin still cannot change the global position, or the dictionary.
      expect(
        (await adminApi.patch(`${adminPath()}/position/${globalPositionId}`, {name: "+Mine"}, FAIL)).status(),
      ).toBe(404);
      expect((await adminApi.patch(`${adminPath()}/dictionary/${dictId}`, {name: "+Mine"}, FAIL)).status()).toBe(404);
    });
    await test.step("an extended dictionary cannot become non-extendable, or be deleted", async () => {
      await expectValidationError(
        await globalAdminApi.patch(`admin/dictionary/${dictId}`, {isExtendable: false}, FAIL),
        {
          field: "isExtendable",
          code: "validation.is_extended",
        },
      );
      await expectValidationError(await globalAdminApi.delete(`admin/dictionary/${dictId}`, undefined, FAIL), {
        field: "id",
        code: "validation.in_use",
      });
    });
    await test.step("a facility dictionary must be extendable; a global name must be unique everywhere", async () => {
      await expectValidationError(
        await globalAdminApi.post(
          "admin/dictionary",
          {facilityId: otherFacilityId, name: "+E2E Closed", isExtendable: false},
          FAIL,
        ),
        {field: "isExtendable", code: "validation.accepted"},
      );
      await expectValidationError(
        await globalAdminApi.post(
          "admin/dictionary",
          {facilityId: null, name: COLOUR_DICT_NAME, isExtendable: true},
          FAIL,
        ),
        {field: "name", code: "validation.unique"},
      );
    });
    await test.step("a position of a facility dictionary cannot belong to another facility", async () => {
      await expectValidationError(
        await globalAdminApi.post(
          "admin/position",
          {facilityId: otherFacilityId, dictionaryId: artifact().colourDictId, name: "+Stray", isDisabled: false},
          FAIL,
        ),
        {field: "dictionaryId", code: "validation.different_facility"},
      );
    });
  });
});
