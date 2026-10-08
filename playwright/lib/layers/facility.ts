import {createdId} from "../responses.ts";
import {createLayer} from "../layers.ts";

const PASSWORD = "jrtJkbsrgjn5#%&";

export const FACILITY = {name: "Integration Test Facility", url: "int-test"} as const;
export const STAFF = {name: "Rob the Staff", email: "test-staff@test.pl", password: `${PASSWORD}staff`} as const;
export const ADMIN = {name: "George the Admin", email: "test-admin@test.pl", password: `${PASSWORD}admin`} as const;
export const STAFF_ADMIN = {
  name: "Sarah the Staff Admin",
  email: "test-staff-admin@test.pl",
  password: `${PASSWORD}staffadmin`,
} as const;
/**
 * Facility member with no role — neither staff, nor admin, nor client. Permissions resolve to
 * `facilityMember: true` (because a member entry exists) with every other facility-permission
 * flag false. Used for testing access-denied semantics for "just a member".
 */
export const BARE_MEMBER = {
  name: "Mark the Bare Member",
  email: "test-bare-member@test.pl",
  password: `${PASSWORD}bare`,
} as const;

export type FacilityArtifact = {
  readonly facilityId: string;
  readonly staffUserId: string;
  readonly adminUserId: string;
  readonly staffAdminUserId: string;
  readonly bareMemberUserId: string;
};

export const facilityLayer = createLayer("Test Facility", async ({api}): Promise<FacilityArtifact> => {
  const facilityRes = await api.createFacility({name: FACILITY.name, url: FACILITY.url});
  const facilityId = await createdId(facilityRes);

  interface MemberRoles {
    readonly hasFacilityAdmin: boolean;
    readonly isFacilityStaff: boolean;
    readonly isActiveFacilityStaff: boolean;
  }

  async function createWithMembership(
    user: {readonly name: string; readonly email: string; readonly password: string},
    roles: MemberRoles,
  ) {
    const userRes = await api.createUser({
      name: user.name,
      email: user.email,
      hasEmailVerified: true,
      password: user.password,
    });
    const userId = await createdId(userRes);
    await api.createMember({userId, facilityId, ...roles});
    // Pre-populate lastLoginFacilityId so the SPA's "/" redirect sends this user straight into
    // the facility (otherwise it falls through to /help when activeFacilityId stays unset).
    const userApi = await api.loggedInAs({email: user.email, password: user.password});
    await userApi.patch("user", {lastLoginFacilityId: facilityId});
    return userId;
  }

  const staffUserId = await createWithMembership(STAFF, {
    hasFacilityAdmin: false,
    isFacilityStaff: true,
    isActiveFacilityStaff: true,
  });
  const adminUserId = await createWithMembership(ADMIN, {
    hasFacilityAdmin: true,
    isFacilityStaff: false,
    isActiveFacilityStaff: false,
  });
  const staffAdminUserId = await createWithMembership(STAFF_ADMIN, {
    hasFacilityAdmin: true,
    isFacilityStaff: true,
    isActiveFacilityStaff: true,
  });
  // Member with no role flags — `facilityMember: true` only, every other facility-permission
  // false. The admin/member endpoint accepts all-false role flags (it's the most general
  // "this user is a member of this facility" state).
  const bareMemberUserId = await createWithMembership(BARE_MEMBER, {
    hasFacilityAdmin: false,
    isFacilityStaff: false,
    isActiveFacilityStaff: false,
  });

  return {facilityId, staffUserId, adminUserId, staffAdminUserId, bareMemberUserId};
});
