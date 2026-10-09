import {ADMIN, FACILITY, STAFF, STAFF_ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {expectValidationError} from "../lib/responses.ts";
import {expect, openPage, readOnlyTest, test} from "../lib/test.ts";

/**
 * Editing staff data. The seed creates STAFF / ADMIN / STAFF_ADMIN as globally-managed users
 * (POSTed via /api/v1/admin/user), so their `managed_by_facility_id` is null. Consequence: a
 * facility admin CAN patch `staff.deactivatedAt` and `staff.hasFacilityAdmin`, but CANNOT patch
 * `name` / `email` via the facility staff endpoint — those land in the 'missing' branch of the
 * patch validator. Only globalAdmin can rename them, via
 * `/api/v1/admin/user/{user}`.
 */

facilityLayer.describe((artifact) => {
  test("facility admin deactivates STAFF; staff/list shows the deactivatedAt", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, staffUserId} = artifact();
    await adminApi.patch(`facility/${facilityId}/user/staff/${staffUserId}`, {
      staff: {deactivatedAt: "2020-01-01T00:00:00Z"},
    });
    const data = await adminApi.list<{id: string; staff: {deactivatedAt: string | null}}>(
      `facility/${facilityId}/user/staff`,
      staffUserId,
    );
    expect(data[0]!.staff.deactivatedAt).toBe("2020-01-01T00:00:00Z");
  });

  test("facility admin clears STAFF's deactivatedAt; staff is active again", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, staffUserId} = artifact();
    await adminApi.patch(`facility/${facilityId}/user/staff/${staffUserId}`, {
      staff: {deactivatedAt: "2020-01-01T00:00:00Z"},
    });
    await adminApi.patch(`facility/${facilityId}/user/staff/${staffUserId}`, {
      staff: {deactivatedAt: null},
    });
    const body = await adminApi.list<{id: string; staff: {deactivatedAt: string | null}}>(
      `facility/${facilityId}/user/staff`,
      staffUserId,
    );
    expect(body[0]!.staff.deactivatedAt).toBeNull();
  });

  test("facility admin promotes STAFF to facilityAdmin; STAFF can hit admin-only endpoint", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, staffUserId} = artifact();
    // Before the promotion, STAFF cannot patch another staff member.
    const beforeApi = await api.loggedInAs(STAFF);
    const before = await beforeApi.patch(
      `facility/${facilityId}/user/staff/${staffUserId}`,
      {staff: {deactivatedAt: null}},
      {allowFailure: true},
    );
    expect(before.status()).toBe(403);

    await adminApi.patch(`facility/${facilityId}/user/staff/${staffUserId}`, {
      staff: {hasFacilityAdmin: true},
    });

    // The same call in the same session now succeeds.
    await beforeApi.patch(`facility/${facilityId}/user/staff/${staffUserId}`, {staff: {deactivatedAt: null}});
  });

  readOnlyTest("facility admin patching a globally-managed staff's name is rejected", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, staffUserId} = artifact();
    const res = await adminApi.patch(
      `facility/${facilityId}/user/staff/${staffUserId}`,
      {name: "Renamed By Facility Admin"},
      {allowFailure: true},
    );
    // The staff's User is global (managed_by_facility_id is null), so `name` becomes 'missing'.
    await expectValidationError(res, {field: "name", code: "validation.missing"});
  });

  test("global admin renames a staff user; facility staff/list reflects the new name", async ({
    api,
    globalAdminApi,
  }) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, staffUserId} = artifact();
    const newName = "Rob (renamed by global)";
    await globalAdminApi.patch(`admin/user/${staffUserId}`, {name: newName});

    const body = await adminApi.list<{id: string; name: string}>(`facility/${facilityId}/user/staff`, staffUserId);
    expect(body[0]!.name).toBe(newName);
  });

  readOnlyTest("STAFF (not facilityAdmin) PATCH on another staff returns 403", async ({api}) => {
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffAdminUserId} = artifact();
    const res = await staffApi.patch(
      `facility/${facilityId}/user/staff/${staffAdminUserId}`,
      {staff: {deactivatedAt: null}},
      {allowFailure: true},
    );
    expect(res.status()).toBe(403);
  });

  test("STAFF_ADMIN demotes ADMIN via /user/admin; ADMIN loses facility-admin access", async ({api}) => {
    const staffAdminApi = await api.loggedInAs(STAFF_ADMIN);
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, adminUserId} = artifact();
    await staffAdminApi.patch(`facility/${facilityId}/user/admin/${adminUserId}`, {
      member: {hasFacilityAdmin: false},
    });
    // ADMIN, logged in before the demotion, can no longer call the path for facility admins only.
    const res = await adminApi.patch(
      `facility/${facilityId}/user/admin/${adminUserId}`,
      {member: {hasFacilityAdmin: true}},
      {allowFailure: true},
    );
    expect(res.status()).toBe(403);
  });

  readOnlyTest("staff/list returns the seeded STAFF and STAFF_ADMIN as staff members", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, staffUserId, staffAdminUserId} = artifact();
    const data = await adminApi.list<{id: string}>(`facility/${facilityId}/user/staff`, [
      staffUserId,
      staffAdminUserId,
    ]);
    expect(data.map((r) => r.id).toSorted()).toEqual([staffUserId, staffAdminUserId].toSorted());
  });

  readOnlyTest("staff/list does NOT include the bare member (no staff role)", async ({api}) => {
    const adminApi = await api.loggedInAs(ADMIN);
    const {facilityId, bareMemberUserId} = artifact();
    const body = await adminApi.list<unknown>(`facility/${facilityId}/user/staff`, bareMemberUserId);
    expect(body).toHaveLength(0);
  });

  // The staff and the admins pages offer these columns to a facility admin only; the server gives
  // them to any staff member who asks. Pinned as it is, not as it should be.
  readOnlyTest(
    "the columns of the account that the pages keep for admins are given to any staff member",
    async ({api}) => {
      const {facilityId, staffAdminUserId} = artifact();
      const staffApi = await api.loggedInAs(STAFF);
      const columns = [
        "hasEmailVerified",
        "passwordExpireAt",
        "lastPasswordChangeAt",
        "isOtpRequired",
        "otpRequiredAt",
        "hasOtpConfigured",
        "lastLoginFailureAt",
        "managedByFacility.name",
      ];
      const account = {
        "hasEmailVerified": true,
        "passwordExpireAt": null,
        "lastPasswordChangeAt": null,
        "isOtpRequired": false,
        "otpRequiredAt": null,
        "hasOtpConfigured": false,
        "lastLoginFailureAt": null,
        "managedByFacility.name": null,
      };
      const filter = {type: "column", column: "id", op: "=", val: staffAdminUserId};
      const staff = await staffApi.tquery(`facility/${facilityId}/user/staff/tquery`, {
        columns: [...columns, "staff.isActive", "staff.deactivatedAt"],
        filter,
      });
      expect(staff.rows).toEqual([{...account, "staff.isActive": true, "staff.deactivatedAt": null}]);
      // The members: also the facilities of a user, by name, whichever they are.
      const members = await staffApi.tquery(`facility/${facilityId}/user/tquery`, {
        columns: [...columns, "facilities.*.name", "facilities.count"],
        filter,
      });
      expect(members.rows).toEqual([{...account, "facilities.*.name": [FACILITY.name], "facilities.count": 1}]);
    },
  );

  readOnlyTest("ADMIN sees the staff page rendering with a known staff name", {tag: "@ui"}, async ({page}) => {
    await openPage(page, `/${FACILITY.url}/staff`, ADMIN);
    await expect(page.getByText(STAFF.name).first()).toBeVisible();
  });
});
