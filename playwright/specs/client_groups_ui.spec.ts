import {clientGroupsLayer} from "../lib/layers/client_groups.ts";
import {FACILITY, STAFF} from "../lib/layers/facility.ts";
import type {Page} from "@playwright/test";
import {chooseInFormSelect, expectFormSuccess, formField, formSelect, submitButton} from "../helpers/selectors.ts";
import {expect, openPage, readOnlyTest, test, type MemoAPI} from "../lib/test.ts";

/**
 * UI-driven tests for client groups. The clientGroupsLayer seed creates three groups; tests
 * exercise the group modals and the group box of a client details page.
 */

async function clientGroupIds(api: MemoAPI, facilityId: string, clientId: string) {
  const data = await api.list<{client: {groupIds: readonly string[]}}>(`facility/${facilityId}/user/client`, clientId);
  return data[0]!.client.groupIds;
}

interface Group {
  readonly notes: string | null;
  readonly clients: readonly {readonly userId: string; readonly role: string | null}[];
}

/** The groups of the given ids that exist. */
async function groups(api: MemoAPI, facilityId: string, ...groupIds: readonly string[]) {
  return api.list<Group & {readonly id: string}>(`facility/${facilityId}/client-group`, groupIds);
}

function byUserId(clients: Group["clients"]) {
  return clients.map(({userId, role}) => ({userId, role})).toSorted((a, b) => a.userId.localeCompare(b.userId));
}

async function openClient(page: Page, clientId: string) {
  await openPage(page, `/${FACILITY.url}/clients/${clientId}`, STAFF);
}

const deleteGroupButton = (page: Page) => page.getByRole("button", {name: "actions.client_group.delete"});

/** The row of buttons under the shown group. The page has another edit button, of the client. */
function groupButtons(page: Page) {
  return page
    .locator("div")
    .filter({has: deleteGroupButton(page)})
    .last();
}

clientGroupsLayer.describe((artifact) => {
  test(
    "creating a client group via the modal: fill notes, submit, see success toast",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, adultClientInfos} = artifact();
      const eve = adultClientInfos.find((c) => c.firstName === "Eve")!;
      await openClient(page, eve.id);
      // Eve has no groups; with one, the button would be for adding another.
      await page.getByRole("button", {name: "actions.client_group.add", exact: true}).click();
      await expect(page.getByRole("heading", {name: /forms\.client_group_create\.form_name/})).toBeVisible();

      const notes = "UI-Created Group Notes";
      await formField(page, "notes").fill(notes);
      // The client of the page is the first member from the start, so the form is valid as it is.
      await submitButton(page, "client_group_create").click();
      await expectFormSuccess(page, "client_group_create");

      const staffApi = await api.loggedInAs(STAFF);
      const groupIds = await clientGroupIds(staffApi, facilityId, eve.id);
      expect(groupIds).toHaveLength(1);
      const body = await staffApi.list<{notes: string | null}>(`facility/${facilityId}/client-group`, groupIds);
      expect(body.map((g) => g.notes)).toEqual([notes]);
    },
  );

  readOnlyTest(
    "cancelling the client-group-create modal leaves no new group behind",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, adultClientInfos} = artifact();
      const eve = adultClientInfos.find((c) => c.firstName === "Eve")!;
      await openClient(page, eve.id);
      await page.getByRole("button", {name: "actions.client_group.add", exact: true}).click();
      const modalTitle = page.getByRole("heading", {name: /forms\.client_group_create\.form_name/});
      await expect(modalTitle).toBeVisible();
      await formField(page, "notes").fill("WILL CANCEL");
      await page
        .getByRole("button", {name: /actions\.cancel/})
        .first()
        .click();

      await expect(modalTitle).toHaveCount(0);
      const staffApi = await api.loggedInAs(STAFF);
      expect(await clientGroupIds(staffApi, facilityId, eve.id)).toHaveLength(0);
    },
  );

  test("editing a group in the modal: notes, a role, a member replaced", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, adultClientInfos, childClientInfos, pairGroup} = artifact();
    const carl = adultClientInfos.find((c) => c.firstName === "Carl")!;
    const eve = adultClientInfos.find((c) => c.firstName === "Eve")!;
    const yara = childClientInfos.find((c) => c.firstName === "Yara")!;
    await openClient(page, carl.id);
    await groupButtons(page).getByRole("button", {name: "actions.edit"}).click();
    await expect(page.getByRole("heading", {name: /forms\.client_group_edit\.form_name/i})).toBeVisible();

    const form = page.locator("form#client_group_edit");
    await expect(formField(form, "notes")).toHaveValue(pairGroup.notes);
    await expect(form).toContainText(carl.name);
    await expect(form).toContainText(yara.name);
    // The client whose page this is cannot be removed here.
    await expect(form.locator("title=facility_user.client_groups.first_client_frozen")).toBeDisabled();

    await formField(form, "notes").fill("Nowak pair, edited");
    // The only member with an active remove button is Yara; Carl is then the only row.
    await form.locator("title=actions.delete").click();
    await expect(form).not.toContainText(yara.name);
    await expect(formSelect(form, "clients.0.userId")).toContainText(carl.name);
    await formField(form, "clients.0.role").fill("father");
    await formSelect(form, "clients.1.userId").click();
    await page.getByRole("option", {name: eve.name}).click();
    await submitButton(page, "client_group_edit").click();

    await expectFormSuccess(page, "client_group_edit");
    const staffApi = await api.loggedInAs(STAFF);
    const [group] = await groups(staffApi, facilityId, pairGroup.id);
    expect(group!.notes).toBe("Nowak pair, edited");
    expect(byUserId(group!.clients)).toEqual(
      byUserId([
        {userId: carl.id, role: "father"},
        {userId: eve.id, role: null},
      ]),
    );
    expect(await clientGroupIds(staffApi, facilityId, yara.id)).toEqual([]);
  });

  test("deleting a group needs a confirmation; its clients stay", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, adultClientInfos, familyGroup, pairGroup, mixedGroup} = artifact();
    const carl = adultClientInfos.find((c) => c.firstName === "Carl")!;
    const staffApi = await api.loggedInAs(STAFF);
    await openClient(page, carl.id);
    const confirmTitle = page.getByRole("heading", {name: /forms\.client_group_delete\.form_name/i});

    await test.step("cancelling the confirmation keeps the group", async () => {
      await deleteGroupButton(page).click();
      await expect(confirmTitle).toBeVisible();
      await page.getByRole("button", {name: "actions.cancel"}).click();
      await expect(confirmTitle).toBeHidden();
      expect(await groups(staffApi, facilityId, pairGroup.id)).toHaveLength(1);
    });

    await deleteGroupButton(page).click();
    await submitButton(page, "client_group_delete").click();
    await expectFormSuccess(page, "client_group_delete");
    // The page falls back to the state of a client in no group.
    await expect(page.getByRole("button", {name: "actions.client_group.add", exact: true})).toBeVisible();
    await expect(deleteGroupButton(page)).toHaveCount(0);

    const all = [familyGroup.id, pairGroup.id, mixedGroup.id];
    expect((await groups(staffApi, facilityId, ...all)).map((g) => g.id).toSorted()).toEqual(
      [familyGroup.id, mixedGroup.id].toSorted(),
    );
    for (const memberId of pairGroup.memberUserIds) {
      expect(await clientGroupIds(staffApi, facilityId, memberId)).toEqual([]);
    }
  });

  test(
    "removing the current client from one of their groups, chosen in the group selector",
    {tag: "@ui"},
    async ({page, api}) => {
      const {facilityId, adultClientInfos, familyGroup, mixedGroup} = artifact();
      const adam = adultClientInfos.find((c) => c.firstName === "Adam")!;
      await openClient(page, adam.id);
      // Adam is in two groups; the box shows the one chosen in the selector.
      const selector = formSelect(page, "selectedGroupId");
      await selector.click();
      await page.getByRole("option", {name: mixedGroup.notes}).click();
      await expect(selector).toContainText(mixedGroup.notes);

      await groupButtons(page)
        .getByRole("button", {name: "facility_user.client_groups.delete_current_client.button"})
        .click();
      await expect(
        page.getByRole("heading", {name: /facility_user\.client_groups\.delete_current_client\.title/i}),
      ).toBeVisible();
      await page.getByRole("button", {name: "facility_user.client_groups.delete_current_client.confirm"}).click();
      await expect(page.getByText("facility_user.client_groups.delete_current_client.success")).toBeVisible();
      // One group is left, so the selector is gone.
      await expect(selector).toHaveCount(0);

      const staffApi = await api.loggedInAs(STAFF);
      const [mixed] = await groups(staffApi, facilityId, mixedGroup.id);
      expect(mixed!.clients.map((c) => c.userId).toSorted()).toEqual(
        mixedGroup.memberUserIds.filter((id) => id !== adam.id).toSorted(),
      );
      const [family] = await groups(staffApi, facilityId, familyGroup.id);
      expect(family!.clients.map((c) => c.userId).toSorted()).toEqual(familyGroup.memberUserIds.toSorted());
      expect(await clientGroupIds(staffApi, facilityId, adam.id)).toEqual([familyGroup.id]);
    },
  );

  test("adding a client to an existing group, found by one of its members", {tag: "@ui"}, async ({page, api}) => {
    const {facilityId, adultClientInfos, pairGroup} = artifact();
    const eve = adultClientInfos.find((c) => c.firstName === "Eve")!;
    const carl = adultClientInfos.find((c) => c.firstName === "Carl")!;
    const diana = adultClientInfos.find((c) => c.firstName === "Diana")!;
    await openClient(page, eve.id);
    await page.getByRole("button", {name: "actions.client_group.add_to"}).click();
    await expect(page.getByRole("heading", {name: /forms\.add_to_client_group\.form_name/i})).toBeVisible();
    const addToGroup = page.getByRole("button", {name: "forms.add_to_client_group.submit.add_to_group"});
    await expect(addToGroup).toBeDisabled();

    async function chooseMember(name: string) {
      await chooseInFormSelect(page, "group_member", name);
    }

    await test.step("the client themselves is not a valid choice", async () => {
      await chooseMember(eve.name);
      await expect(page.getByText("forms.add_to_client_group.text.group_member_is_same")).toBeVisible();
      await expect(addToGroup).toBeDisabled();
    });

    await test.step("a member of no group: the form offers creating a group instead", async () => {
      await chooseMember(diana.name);
      await expect(page.getByText("forms.add_to_client_group.text.no_groups")).toBeVisible();
      await expect(page.getByRole("button", {name: "forms.add_to_client_group.submit.create_group"})).toBeVisible();
      await expect(addToGroup).toHaveCount(0);
    });

    await chooseMember(carl.name);
    await addToGroup.click();
    // The group's edit form opens with the client appended.
    const form = page.locator("form#client_group_edit");
    await expect(formField(form, "notes")).toHaveValue(pairGroup.notes);
    await expect(form).toContainText(eve.name);
    await submitButton(page, "client_group_edit").click();
    await expectFormSuccess(page, "client_group_edit");
    await expect(page.getByRole("heading", {name: /forms\.add_to_client_group\.form_name/i})).toBeHidden();

    const staffApi = await api.loggedInAs(STAFF);
    const [group] = await groups(staffApi, facilityId, pairGroup.id);
    expect(group!.clients.map((c) => c.userId).toSorted()).toEqual([...pairGroup.memberUserIds, eve.id].toSorted());
    expect(group!.notes).toBe(pairGroup.notes);
    expect(await clientGroupIds(staffApi, facilityId, eve.id)).toEqual([pairGroup.id]);
  });
});
