import {STAFF, STAFF_ADMIN} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {MemoAPI, expect, test} from "../lib/test.ts";

/**
 * "Deactivating a staff member" has three valid interpretations on Memo. For each: after the
 * deactivation, the deactivated user can no longer access any facility data (either because they
 * can no longer log in at all, or because they retain authentication but lose facility-staff
 * permission), yet they remain referenced on the meetings they were previously scheduled on so
 * other staff can still see them as attendants.
 */

/** Expects STAFF to be the staff member of the seeded meetings still, as another user sees them. */
async function expectStaffStillReferencedOnMeetings(adminApi: MemoAPI): Promise<void> {
  const {facilityId, staffUserId, pastMeeting, todayMeeting, futureMeeting} = meetingsLayer.getArtifact();
  const ids = [pastMeeting.id, todayMeeting.id, futureMeeting.id];
  const meetings = await adminApi.list<{id: string; staff: readonly {userId: string}[]}>(
    `facility/${facilityId}/meeting`,
    ids,
  );
  expect(Object.fromEntries(meetings.map((m) => [m.id, m.staff.map((a) => a.userId)]))).toEqual(
    Object.fromEntries(ids.map((id) => [id, [staffUserId]])),
  );
}

/** Returns the status that the session, of STAFF, gets from an endpoint of the facility. */
async function facilityAccessStatus(staffApi: MemoAPI) {
  const {facilityId, todayMeeting} = meetingsLayer.getArtifact();
  const res = await staffApi.get(`facility/${facilityId}/meeting/list?in=${todayMeeting.id}`, {allowFailure: true});
  return res.status();
}

meetingsLayer.describe(() => {
  test("deactivate via staff.deactivated_at: STAFF loses facility access, still on past meetings", async ({api}) => {
    const staffAdminApi = await api.loggedInAs(STAFF_ADMIN);
    const staffApi = await api.loggedInAs(STAFF);
    const {facilityId, staffUserId} = meetingsLayer.getArtifact();
    expect(await facilityAccessStatus(staffApi)).toBe(200);
    await staffAdminApi.patch(`facility/${facilityId}/user/staff/${staffUserId}`, {
      staff: {deactivatedAt: "2020-01-01T00:00:00Z"},
    });

    await test.step("STAFF, logged in before, is forbidden from facility endpoints", async () => {
      expect(await facilityAccessStatus(staffApi)).toBe(403);
    });
    await test.step("STAFF_ADMIN still sees STAFF as a staff attendant on the seeded meetings", async () => {
      await expectStaffStillReferencedOnMeetings(staffAdminApi);
    });
  });

  test("deactivate via hasEmailVerified=false: STAFF loses facility access, still on past meetings", async ({
    api,
    globalAdminApi,
  }) => {
    const staffAdminApi = await api.loggedInAs(STAFF_ADMIN);
    const staffApi = await api.loggedInAs(STAFF);
    const {staffUserId} = meetingsLayer.getArtifact();
    expect(await facilityAccessStatus(staffApi)).toBe(200);
    await globalAdminApi.patch(`admin/user/${staffUserId}`, {hasEmailVerified: false});

    await test.step("STAFF, logged in before, is forbidden from facility endpoints", async () => {
      expect(await facilityAccessStatus(staffApi)).toBe(403);
    });
    await test.step("STAFF_ADMIN still sees STAFF as a staff attendant on the seeded meetings", async () => {
      await expectStaffStillReferencedOnMeetings(staffAdminApi);
    });
  });

  test("deactivate by removing the password: STAFF can no longer log in, still on past meetings", async ({
    api,
    globalAdminApi,
  }) => {
    const staffAdminApi = await api.loggedInAs(STAFF_ADMIN);
    const {staffUserId} = meetingsLayer.getArtifact();
    await globalAdminApi.patch(`admin/user/${staffUserId}`, {password: null, hasPassword: false});

    await test.step("STAFF login is rejected (401)", async () => {
      expect((await MemoAPI.attemptLogin(STAFF)).status).toBe(401);
    });
    await test.step("STAFF_ADMIN still sees STAFF as a staff attendant on the seeded meetings", async () => {
      await expectStaffStillReferencedOnMeetings(staffAdminApi);
    });
  });
});
