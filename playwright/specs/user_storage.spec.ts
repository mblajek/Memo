import {ADMIN, STAFF} from "../lib/layers/facility.ts";
import {secondFacilityLayer} from "../lib/layers/second_facility.ts";
import {expectValidationError, expectValidationErrors} from "../lib/responses.ts";
import {expect, readOnlyTest, test} from "../lib/test.ts";
import {lastLoginFacilityId, storageKeys, storageValue} from "../helpers/queries.ts";

/**
 * The per-user key-value storage (`user/storage`), which the app keeps persistent settings in,
 * and `PATCH /user`.
 */

const keys = storageKeys;
const value = storageValue;

secondFacilityLayer.describe((artifact) => {
  test("user storage: put, get, list, overwrite and remove; another user sees none of it", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const adminApi = await api.loggedInAs(ADMIN);
    const before = await keys(staffApi);
    expect(before).not.toContain("e2e:first");
    expect(await value(staffApi, "e2e:first")).toBeNull();

    const first = {zoom: 2, hidden: ["a", "b"], nested: {on: true}};
    const put = await staffApi.put("user/storage/e2e:first", first);
    expect(((await put.json()) as string[]).toSorted()).toEqual([...before, "e2e:first"].toSorted());
    expect(await value(staffApi, "e2e:first")).toEqual(first);
    await staffApi.put("user/storage/e2e:second", "just a string");
    expect(await value(staffApi, "e2e:second")).toBe("just a string");
    expect((await keys(staffApi)).toSorted()).toEqual([...before, "e2e:first", "e2e:second"].toSorted());

    await staffApi.put("user/storage/e2e:first", [1, 2, 3]);
    expect(await value(staffApi, "e2e:first")).toEqual([1, 2, 3]);

    // The storage is the user's own.
    expect(await keys(adminApi)).not.toContain("e2e:first");
    expect(await value(adminApi, "e2e:first")).toBeNull();
    await adminApi.put("user/storage/e2e:first", "the admin's");
    expect(await value(staffApi, "e2e:first")).toEqual([1, 2, 3]);

    // A null removes the key.
    const removed = await staffApi.put("user/storage/e2e:first", null);
    expect(((await removed.json()) as string[]).toSorted()).toEqual([...before, "e2e:second"].toSorted());
    expect(await value(staffApi, "e2e:first")).toBeNull();
    expect(await value(adminApi, "e2e:first")).toBe("the admin's");
  });

  readOnlyTest("user storage and `PATCH /user` need a logged-in user", async ({api}) => {
    for (const res of [
      await api.get("user/storage", {allowFailure: true}),
      await api.get("user/storage/e2e:first", {allowFailure: true}),
      await api.put("user/storage/e2e:first", {a: 1}, {allowFailure: true}),
      await api.patch("user", {lastLoginFacilityId: artifact().facilityId}, {allowFailure: true}),
    ]) {
      expect(res.status(), res.url()).toBe(401);
    }
  });

  readOnlyTest("`PATCH /user` refuses a facility that does not exist", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const res = await staffApi.patch(
      "user",
      {lastLoginFacilityId: "0a0b0c0d-1111-4222-8333-444455556666"},
      {allowFailure: true},
    );
    await expectValidationError(res, {field: "lastLoginFacilityId", code: "validation.exists"});
    await expectValidationError(await staffApi.patch("user", {lastLoginFacilityId: "nope"}, {allowFailure: true}), {
      field: "lastLoginFacilityId",
      code: "validation.uuid",
    });
    expect(await lastLoginFacilityId(staffApi)).toBe(artifact().facilityId);
  });

  readOnlyTest("`PATCH /user` refuses a facility the user is not a member of", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const res = await staffApi.patch("user", {lastLoginFacilityId: artifact().otherFacilityId}, {allowFailure: true});
    await expectValidationErrors(res, [{field: "lastLoginFacilityId", code: "validation.exists"}]);
    expect(await lastLoginFacilityId(staffApi)).toBe(artifact().facilityId);
  });
});
