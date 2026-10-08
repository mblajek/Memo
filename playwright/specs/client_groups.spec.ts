import {clientGroupsLayer} from "../lib/layers/client_groups.ts";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import {expect, openPage, readOnlyTest, test} from "../lib/test.ts";

clientGroupsLayer.describe((artifact) => {
  readOnlyTest("all three seeded groups are returned by client-group/list", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, familyGroup, pairGroup, mixedGroup} = artifact();
    const ids = [familyGroup.id, pairGroup.id, mixedGroup.id];
    const data = await staffApi.list<{id: string; notes: string | null; clients: readonly {userId: string}[]}>(
      `facility/${facilityId}/client-group`,
      ids,
    );
    expect(data).toHaveLength(3);
    const byId = new Map(data.map((g) => [g.id, g]));
    for (const seed of [familyGroup, pairGroup, mixedGroup]) {
      const g = byId.get(seed.id);
      expect(g, `group ${seed.notes} missing`).toBeDefined();
      expect(g!.notes).toBe(seed.notes);
      expect(g!.clients.map((c) => c.userId).sort()).toEqual([...seed.memberUserIds].sort());
    }
  });

  readOnlyTest("the groups hold the expected clients, by name and type", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, familyGroup, pairGroup, mixedGroup} = artifact();
    const dicts = await staffApi.dictionaries();
    const typeNames = new Map([
      [dicts.clientType!.adult!, "adult"],
      [dicts.clientType!.child!, "child"],
    ]);
    const groupIds = [familyGroup.id, pairGroup.id, mixedGroup.id];
    const groups = await staffApi.list<{id: string; clients: readonly {userId: string}[]}>(
      `facility/${facilityId}/client-group`,
      groupIds,
    );
    const memberIds = [...new Set(groups.flatMap((g) => g.clients.map((c) => c.userId)))];
    const clients = new Map(
      (
        await staffApi.list<{id: string; name: string; client: {typeDictId: string}}>(
          `facility/${facilityId}/user/client`,
          memberIds,
        )
      ).map((c) => [c.id, `${c.name} (${typeNames.get(c.client.typeDictId)})`]),
    );
    const members = (groupId: string) =>
      groups
        .find((g) => g.id === groupId)!
        .clients.map((c) => clients.get(c.userId))
        .toSorted();
    expect(members(familyGroup.id)).toEqual([
      "Adam Kowalski (adult)",
      "Bea Kowalski (adult)",
      "Will Kowalski (child)",
      "Zoe Kowalski (child)",
    ]);
    expect(members(pairGroup.id)).toEqual(["Carl Nowak (adult)", "Yara Nowak (child)"]);
    // Adam is in two groups; the children of this one have another surname.
    expect(members(mixedGroup.id)).toEqual([
      "Adam Kowalski (adult)",
      "Violet Wisniewski (child)",
      "Xander Wisniewski (child)",
    ]);
  });

  readOnlyTest("client tquery group counts: Adam in 2, Bea in 1, Eve in 0", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, adultClientInfos} = artifact();
    const adam = adultClientInfos.find((i) => i.firstName === "Adam")!;
    const bea = adultClientInfos.find((i) => i.firstName === "Bea")!;
    const eve = adultClientInfos.find((i) => i.firstName === "Eve")!;
    const body = await staffApi.tquery<{"id": string; "client.groups.count": number}>(
      `facility/${facilityId}/user/client/tquery`,
      {
        columns: ["id", "client.groups.count"],
        filter: {type: "column", column: "id", op: "in", val: [adam.id, bea.id, eve.id]},
        pageSize: 10,
      },
    );
    const byId = new Map(body.rows.map((r) => [r.id, r["client.groups.count"]]));
    expect(byId.get(adam.id), "Adam should be in 2 groups").toBe(2);
    expect(byId.get(bea.id), "Bea should be in 1 group").toBe(1);
    expect(byId.get(eve.id), "Eve should be in 0 groups").toBe(0);
  });

  readOnlyTest("client details page of a group member shows the client and the group", {tag: "@ui"}, async ({page}) => {
    const {familyGroup, adultClientInfos, childClientInfos} = artifact();
    const member = [...adultClientInfos, ...childClientInfos].find(({id}) => id === familyGroup.memberUserIds[0])!;
    await openPage(page, `/${FACILITY.url}/clients/${member.id}`, STAFF);
    const main = page.locator("main");
    await expect(main.getByText(member.name).first()).toBeVisible();
    await expect(main.getByText(familyGroup.notes).first()).toBeVisible();
  });

  test("staff deletes one group; the other two remain", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, familyGroup, pairGroup, mixedGroup} = artifact();
    await staffApi.delete(`facility/${facilityId}/client-group/${pairGroup.id}`);
    const body = await staffApi.list<{id: string}>(`facility/${facilityId}/client-group`, [
      familyGroup.id,
      pairGroup.id,
      mixedGroup.id,
    ]);
    expect(body.map((g) => g.id).toSorted()).toEqual([familyGroup.id, mixedGroup.id].toSorted());
  });

  test("staff edits the family group's notes via API", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, familyGroup} = artifact();
    const newNotes = "Kowalski family (edited)";
    await staffApi.patch(`facility/${facilityId}/client-group/${familyGroup.id}`, {notes: newNotes});
    const data = await staffApi.list<{id: string; notes: string | null}>(
      `facility/${facilityId}/client-group`,
      familyGroup.id,
    );
    expect(data[0]!.notes).toBe(newNotes);
  });
});
