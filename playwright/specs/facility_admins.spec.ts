import {createdId, expectValidationErrors} from "../lib/responses.ts";
import {ADMIN, facilityLayer} from "../lib/layers/facility.ts";
import {MemoAPI, expect, readOnlyTest, test} from "../lib/test.ts";

/**
 * Editing facility admins through `/facility/{id}/user/admin/{user}`. The user's own data (name,
 * email, password…) is editable there only for users managed by the facility; the seeded users
 * are managed globally, so the tests needing a managed one create it.
 */

const MANAGED_ADMIN = {
  name: "Managed Admin",
  email: "managed-admin@test.pl",
  password: "ManagedAdminPass1!",
} as const;

facilityLayer.describe((artifact) => {
  test("facility admin changes a facility-managed admin's email and password", async ({api, globalAdminApi}) => {
    const {facilityId} = artifact();
    const userRes = await globalAdminApi.createUser({
      ...MANAGED_ADMIN,
      hasEmailVerified: true,
      managedByFacilityId: facilityId,
    });
    const userId = await createdId(userRes);
    await globalAdminApi.createMember({userId, facilityId, hasFacilityAdmin: true});

    const adminApi = await api.loggedInAs(ADMIN);
    const newCreds = {email: "managed-admin-new@test.pl", password: "ChangedByAdminPass2!"};
    await adminApi.patch(`facility/${facilityId}/user/admin/${userId}`, {
      email: newCreds.email,
      hasEmailVerified: true,
      hasPassword: true,
      password: newCreds.password,
      passwordExpireAt: null,
    });

    const data = await globalAdminApi.list<{email: string; managedByFacilityId: string | null}>(`admin/user`, userId);
    expect(data[0]).toMatchObject({email: newCreds.email, managedByFacilityId: facilityId});
    expect((await MemoAPI.attemptLogin(newCreds)).status).toBe(200);
  });

  readOnlyTest("facility admin patching a globally-managed admin's email is rejected", async ({api}) => {
    const {facilityId, staffAdminUserId} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    const res = await adminApi.patch(
      `facility/${facilityId}/user/admin/${staffAdminUserId}`,
      {email: "hijacked@test.pl"},
      {allowFailure: true},
    );
    await expectValidationErrors(res, [{field: "email", code: "validation.missing"}]);
  });
});
