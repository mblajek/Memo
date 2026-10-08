import {clientAttributes} from "../helpers/queries.ts";
import {CLIENTS_ADULTS, CLIENTS_CHILDREN, clientsLayer} from "../lib/layers/clients.ts";
import {ADMIN, FACILITY, STAFF} from "../lib/layers/facility.ts";
import {expectValidationError, expectValidationErrors, responseData} from "../lib/responses.ts";
import {expect, openPage, readOnlyTest, test} from "../lib/test.ts";

clientsLayer.describe((artifact) => {
  readOnlyTest("staff sees the facility clients", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/clients`, STAFF);
    for (const name of [...CLIENTS_ADULTS, ...CLIENTS_CHILDREN]) {
      await expect(page.locator("main").getByText(name)).toBeVisible();
    }
  });

  readOnlyTest("clients tquery returns seeded clients", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const body = await staffApi.tquery<{name: string}>(`facility/${facilityId}/user/client/tquery`, {
      columns: ["id", "name"],
      sort: [{column: "name", desc: false}],
    });
    const allNames = [...CLIENTS_ADULTS, ...CLIENTS_CHILDREN];
    for (const name of allNames) {
      expect(
        body.rows.some((row) => row.name === name),
        `missing client ${name}`,
      ).toBe(true);
    }
    expect(body.total).toBe(allNames.length);
  });

  readOnlyTest("every seeded client has a non-empty shortCode via user/client/list", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, adultClientInfos, childClientInfos} = artifact();
    const ids = [...adultClientInfos, ...childClientInfos].map((c) => c.id);
    const data = await staffApi.list<{id: string; name: string; client: {shortCode: string}}>(
      `facility/${facilityId}/user/client`,
      ids,
    );
    expect(data).toHaveLength(ids.length);
    for (const row of data) {
      expect(row.client.shortCode, `client ${row.name} missing shortCode`).toBeTruthy();
    }
  });

  readOnlyTest("client details page shows the seeded client", {tag: "@ui"}, async ({page}) => {
    const {adultClientInfos} = artifact();
    const first = adultClientInfos[0];
    expect(first).toBeDefined();
    await openPage(page, `/${FACILITY.url}/clients/${first!.id}`, STAFF);
    await expect(page.getByText(first!.name).first()).toBeVisible();
  });

  readOnlyTest("tquery surname filter narrows the result to one family", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const body = await staffApi.tquery<{name: string}>(`facility/${facilityId}/user/client/tquery`, {
      columns: ["name"],
      // Three adults + two children carry the "Kowalski" surname.
      filter: {type: "column", column: "name", op: "%v%", val: "Kowalski"},
    });
    expect(body.rows).toHaveLength(5);
    for (const row of body.rows) {
      expect(row.name.endsWith("Kowalski"), `unexpected name ${row.name}`).toBe(true);
    }
  });

  readOnlyTest("seeded clients carry the varied fields populated in setup", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, adultClientInfos, childClientInfos} = artifact();
    const ids = [...adultClientInfos, ...childClientInfos].map((c) => c.id);
    const body = await staffApi.list<{
      name: string;
      client: {
        birthDate: string | null;
        contactEmail: string | null;
        contactPhone: string | null;
        addressCity: string | null;
        notes: string | null;
        genderDictId: string | null;
      };
    }>(`facility/${facilityId}/user/client`, ids);
    const byName = new Map(body.map((r) => [r.name, r.client]));
    expect(byName.get("Adam Kowalski")?.contactPhone).toBe("+48 600 100 001");
    expect(byName.get("Bea Kowalski")?.contactEmail).toBe("bea@example.test");
    expect(byName.get("Carl Nowak")?.addressCity).toBe("Warszawa");
    expect(byName.get("Diana Wisniewski")?.notes).toBe("VIP client");
    expect(byName.get("Zoe Kowalski")?.birthDate).toBe("2015-06-22");
    // Eve has no notes: null, or no field at all.
    expect(byName.get("Eve Kowalski")?.notes ?? null).toBeNull();
  });

  readOnlyTest("staff delete-client API on a real client returns 403", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, adultClientInfos} = artifact();
    const target = adultClientInfos[0];
    expect(target).toBeDefined();
    const res = await staffApi.delete(`facility/${facilityId}/user/client/${target!.id}`, undefined, {
      allowFailure: true,
    });
    expect(res.status()).toBe(403);
  });
});

clientsLayer.describe((artifact) => {
  test("staff edits a client's name; tquery reflects the new name", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, adultClientInfos} = artifact();
    const target = adultClientInfos[0]!;
    const newName = `${target.name} (edited)`;
    await staffApi.patch(`facility/${facilityId}/user/client/${target.id}`, {name: newName, client: {}});
    const body = await staffApi.tquery<{id: string; name: string}>(`facility/${facilityId}/user/client/tquery`, {
      columns: ["id", "name"],
    });
    const row = body.rows.find((r) => r.id === target.id);
    expect(row?.name).toBe(newName);
  });

  test("staff edits multiple client fields at once; each value persists", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, adultClientInfos} = artifact();
    const target = adultClientInfos[3]!; // Diana — has notes "VIP client"
    await staffApi.patch(`facility/${facilityId}/user/client/${target.id}`, {
      client: {
        notes: "edited notes",
        contactEmail: "diana-edited@example.test",
        addressCity: "Krakow",
      },
    });
    const data = await staffApi.list<{
      client: {notes: string | null; contactEmail: string | null; addressCity: string | null};
    }>(`facility/${facilityId}/user/client`, target.id);
    expect(data[0]!.client.notes).toBe("edited notes");
    expect(data[0]!.client.contactEmail).toBe("diana-edited@example.test");
    expect(data[0]!.client.addressCity).toBe("Krakow");
  });

  test("staff sets and clears birthDate via successive PATCHes", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, adultClientInfos} = artifact();
    const target = adultClientInfos[4]!; // Eve — no birthDate seeded
    await staffApi.patch(`facility/${facilityId}/user/client/${target.id}`, {
      client: {birthDate: "1990-01-15"},
    });
    const birthDate = async () => (await clientAttributes(staffApi, facilityId, target.id)).birthDate;
    expect(await birthDate()).toBe("1990-01-15");

    await staffApi.patch(`facility/${facilityId}/user/client/${target.id}`, {
      client: {birthDate: null},
    });
    // Null, or no field at all.
    expect((await birthDate()) ?? null).toBeNull();
  });

  readOnlyTest(
    "staff patching client with an invalid birthDate returns 400 with field=client.birthDate",
    async ({api}) => {
      const staffApi = await api.loggedInAs(STAFF);
      const {facilityId, adultClientInfos} = artifact();
      const target = adultClientInfos[0]!;
      const res = await staffApi.patch(
        `facility/${facilityId}/user/client/${target.id}`,
        {client: {birthDate: "not-a-date"}},
        {allowFailure: true},
      );
      await expectValidationError(res, {field: "client.birthDate", code: "validation.date_format"});
    },
  );

  test("staff creates a new client; it is listed and has a shortCode", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const dicts = await staffApi.dictionaries();
    const res = await staffApi.createFacilityClient(facilityId, {
      name: "Helga Newman",
      client: {typeDictId: dicts.clientType!.adult!, contactPhone: "+48 600 555 555"},
    });
    const {id, shortCode} = await responseData<{id: string; shortCode: string}>(res);
    expect(shortCode).toBeTruthy();

    const body = await staffApi.list<{name: string; client: {contactPhone: string | null; shortCode: string}}>(
      `facility/${facilityId}/user/client`,
      id,
    );
    expect(body[0]!.name).toBe("Helga Newman");
    expect(body[0]!.client.contactPhone).toBe("+48 600 555 555");
  });

  readOnlyTest("creating a client without typeDictId is rejected", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const res = await staffApi.post(
      `facility/${facilityId}/user/client`,
      {name: "No Type Client", client: {}},
      {allowFailure: true},
    );
    await expectValidationError(res, {field: "client.typeDictId", code: "validation.present"});
  });

  test("admin deletes a client; tquery total drops by one", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, childClientInfos} = artifact();
    const target = childClientInfos[childClientInfos.length - 1];
    expect(target).toBeDefined();
    const beforeBody = await adminApi.tquery(`facility/${facilityId}/user/client/tquery`, {
      columns: ["id"],
      pageSize: 1,
    });

    const delRes = await adminApi.delete(`facility/${facilityId}/user/client/${target!.id}`);
    expect((await responseData<{clientDeleted: boolean}>(delRes)).clientDeleted).toBe(true);

    const afterBody = await adminApi.tquery(`facility/${facilityId}/user/client/tquery`, {
      columns: ["id"],
      pageSize: 1,
    });
    expect(afterBody.total).toBe(beforeBody.total - 1);
  });

  readOnlyTest("clients tquery sorts by name in both directions", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const sortedNames = async (desc: boolean) => {
      return (
        await staffApi.tquery<{name: string}>(`facility/${facilityId}/user/client/tquery`, {
          columns: ["name"],
          sort: [{column: "name", desc}],
        })
      ).rows.map((row) => row.name);
    };
    const expected = [...CLIENTS_ADULTS, ...CLIENTS_CHILDREN].toSorted();
    expect(await sortedNames(false)).toEqual(expected);
    expect(await sortedNames(true)).toEqual(expected.toReversed());
  });

  readOnlyTest("client create validates each field", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId} = artifact();
    const dicts = await staffApi.dictionaries();
    const adult = dicts.clientType!.adult!;
    const total = async () => {
      return (
        await staffApi.tquery(`facility/${facilityId}/user/client/tquery`, {
          columns: ["id"],
          pageSize: 1,
        })
      ).total;
    };
    const before = await total();
    const inDictionary = "validation.custom.position_in_dictionary";
    for (const [errors, body] of [
      [{name: "validation.present"}, {client: {typeDictId: adult}}],
      [{name: "validation.required"}, {name: "", client: {typeDictId: adult}}],
      [{"client": "validation.present", "client.typeDictId": "validation.present"}, {name: "No Client Part"}],
      // A position of another dictionary.
      [{"client.typeDictId": inDictionary}, {name: "Wrong Type", client: {typeDictId: dicts.gender!.male!}}],
      [{"client.genderDictId": inDictionary}, {name: "Wrong Gender", client: {typeDictId: adult, genderDictId: adult}}],
      [
        {"client.birthDate": "validation.date_format"},
        {name: "Bad Date", client: {typeDictId: adult, birthDate: "2020-02-30"}},
      ],
      [
        {"client.notificationMethodDictIds.0": inDictionary},
        {name: "Bad Method", client: {typeDictId: adult, notificationMethodDictIds: [adult]}},
      ],
    ] as const) {
      const res = await staffApi.post(`facility/${facilityId}/user/client`, body, {allowFailure: true});
      await expectValidationErrors(
        res,
        Object.entries(errors).map(([field, code]) => ({field, code})),
      );
    }
    expect(await total()).toBe(before);
  });
});
