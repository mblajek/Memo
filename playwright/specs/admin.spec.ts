import {createdId, expectValidationError, expectValidationErrors} from "../lib/responses.ts";
import {MemoAPI, expect, readOnlyTest, test} from "../lib/test.ts";

/** Global admin operations, on the root layer: with no facility of the tests yet. */

const PASSWORD = "AdminTestPass1!";

test("admin creates a facility; it appears in admin/facility/list", async ({globalAdminApi}) => {
  const create = await globalAdminApi.createFacility({name: "Created Facility A", url: "created-fac-a"});
  const id = await createdId(create);
  expect(id).toBeTruthy();
  // admin/facility/list returns ALL facilities (no `in=` filtering on this endpoint), so look the
  // created one up by id rather than asserting list length.
  const data = await globalAdminApi.getData<readonly {id: string; name: string; url: string}[]>("admin/facility/list");
  const created = data.find((f) => f.id === id);
  expect(created).toMatchObject({id, name: "Created Facility A", url: "created-fac-a"});
});

test("admin creating a facility with a duplicate URL is rejected", async ({globalAdminApi}) => {
  await globalAdminApi.createFacility({name: "First", url: "dup-url"});
  const res = await globalAdminApi.createFacility({name: "Second", url: "dup-url"}, {allowFailure: true});
  await expectValidationError(res, {field: "url", code: "validation.unique"});
});

test("admin edits a facility name; tquery reflects the new name", async ({globalAdminApi}) => {
  const create = await globalAdminApi.createFacility({name: "Before", url: "rename-me"});
  const id = await createdId(create);
  await globalAdminApi.patch(`admin/facility/${id}`, {name: "After"});
  const {rows} = await globalAdminApi.tquery("admin/facility/tquery", {
    columns: ["id", "name"],
    filter: {type: "column", column: "id", op: "=", val: id},
  });
  expect(rows).toEqual([{id, name: "After"}]);
});

test("admin creates a global user; user appears in admin/user/list", async ({globalAdminApi}) => {
  const email = "admin-test-user@test.pl";
  const res = await globalAdminApi.createUser({
    name: "Created User",
    email,
    password: PASSWORD,
    hasEmailVerified: true,
  });
  const id = await createdId(res);
  const body = await globalAdminApi.list<{id: string; email: string; name: string}>(`admin/user`, id);
  expect(body).toHaveLength(1);
  expect(body[0]).toMatchObject({id, email, name: "Created User"});
});

readOnlyTest("admin/user/list without the `in` query returns 400", async ({globalAdminApi}) => {
  const res = await globalAdminApi.get("admin/user/list", {allowFailure: true});
  await expectValidationErrors(res, [{field: "in", code: "validation.required"}]);
});

test("admin creates a user, then a new user can log in via API", async ({globalAdminApi}) => {
  const email = "admin-loginable@test.pl";
  await globalAdminApi.createUser({name: "Loginable", email, password: PASSWORD, hasEmailVerified: true});
  expect((await MemoAPI.attemptLogin({email, password: PASSWORD})).status).toBe(200);
});

test("admin patches a user's name; updated value is returned by tquery", async ({globalAdminApi}) => {
  const email = "admin-rename@test.pl";
  const res = await globalAdminApi.createUser({
    name: "Original Name",
    email,
    password: PASSWORD,
    hasEmailVerified: true,
  });
  const id = await createdId(res);
  await globalAdminApi.patch(`admin/user/${id}`, {name: "Renamed"});
  const {rows} = await globalAdminApi.tquery("admin/user/tquery", {
    columns: ["id", "name"],
    filter: {type: "column", column: "id", op: "=", val: id},
  });
  expect(rows).toEqual([{id, name: "Renamed"}]);
});

test("admin assigns a user to a facility as staff; facility user tquery includes them", async ({globalAdminApi}) => {
  const facilityRes = await globalAdminApi.createFacility({
    name: "Memberable Facility",
    url: "memberable-fac",
  });
  const facilityId = await createdId(facilityRes);
  const userRes = await globalAdminApi.createUser({
    name: "To Be Staff",
    email: "to-be-staff@test.pl",
    password: PASSWORD,
    hasEmailVerified: true,
  });
  const userId = await createdId(userRes);

  await globalAdminApi.createMember({
    userId,
    facilityId,
    isFacilityStaff: true,
    isActiveFacilityStaff: true,
  });

  // As the new staff member: the tquery of the facility's users is for its staff.
  const staffUserApi = await globalAdminApi.loggedInAs({email: "to-be-staff@test.pl", password: PASSWORD});
  const {rows} = await staffUserApi.tquery<{id: string}>(`facility/${facilityId}/user/tquery`, {
    columns: ["id"],
    filter: {type: "column", column: "id", op: "=", val: userId},
  });
  expect(rows).toEqual([{id: userId}]);
});

test("admin promotes a member to facilityAdmin; promotion grants admin endpoints", async ({globalAdminApi}) => {
  const facilityRes = await globalAdminApi.createFacility({name: "Promo Facility", url: "promo-fac"});
  const facilityId = await createdId(facilityRes);
  const userRes = await globalAdminApi.createUser({
    name: "To Promote",
    email: "to-promote@test.pl",
    password: PASSWORD,
    hasEmailVerified: true,
  });
  const userId = await createdId(userRes);
  const memberRes = await globalAdminApi.createMember({
    userId,
    facilityId,
    isFacilityStaff: true,
    isActiveFacilityStaff: true,
    hasFacilityAdmin: false,
  });
  const memberId = await createdId(memberRes);

  // An endpoint for facility admins only is closed to the user before the promotion, open after.
  const userApi = await globalAdminApi.loggedInAs({email: "to-promote@test.pl", password: PASSWORD});
  const patchAdmin = () =>
    userApi.patch(
      `facility/${facilityId}/user/admin/${userId}`,
      {member: {hasFacilityAdmin: true}},
      {allowFailure: true},
    );
  expect((await patchAdmin()).status()).toBe(403);
  await globalAdminApi.patch(`admin/member/${memberId}`, {hasFacilityAdmin: true});
  expect((await patchAdmin()).status()).toBe(200);
});

test("admin removing a member revokes facility access", async ({globalAdminApi}) => {
  const facilityRes = await globalAdminApi.createFacility({name: "Revoke Facility", url: "revoke-fac"});
  const facilityId = await createdId(facilityRes);
  const userRes = await globalAdminApi.createUser({
    name: "To Revoke",
    email: "to-revoke@test.pl",
    password: PASSWORD,
    hasEmailVerified: true,
  });
  const userId = await createdId(userRes);
  const memberRes = await globalAdminApi.createMember({
    userId,
    facilityId,
    isFacilityStaff: true,
    isActiveFacilityStaff: true,
  });
  const memberId = await createdId(memberRes);
  // The user, logged in before, has the endpoints of the facility until the member is removed.
  const userApi = await globalAdminApi.loggedInAs({email: "to-revoke@test.pl", password: PASSWORD});
  const queryUsers = () =>
    userApi.post(
      `facility/${facilityId}/user/tquery`,
      {columns: [{type: "column", column: "id"}], paging: {size: 1}},
      {allowFailure: true},
    );
  expect((await queryUsers()).status()).toBe(200);
  await globalAdminApi.delete(`admin/member/${memberId}`);
  expect((await queryUsers()).status()).toBe(403);
});
