import {ADMIN} from "../lib/layers/facility.ts";
import {meetingsLayer} from "../lib/layers/meetings.ts";
import {expectValidationError, expectValidationErrors, responseData} from "../lib/responses.ts";
import {expect, test} from "../lib/test.ts";
import {meetingClientIds, clientExists} from "../helpers/queries.ts";

/**
 * Deleting a client who attends meetings. Such a client can only be deleted as a duplicate of
 * another client, who then takes over the meetings.
 */

meetingsLayer.describe((artifact) => {
  test("a client attending a meeting can only be deleted as a duplicate of another client", async ({api}) => {
    const {facilityId, adultClientInfos, childClientInfos, pastMeeting} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    // Adam attends the past meeting; Violet attends none.
    const attending = adultClientInfos[0]!.id;
    const replacement = childClientInfos[4]!.id;
    const path = `facility/${facilityId}/user/client/${attending}`;
    expect(await meetingClientIds(adminApi, facilityId, pastMeeting.id)).toEqual([attending]);

    await test.step("a plain delete is refused", async () => {
      const res = await adminApi.delete(path, undefined, {allowFailure: true});
      await expectValidationErrors(res, [{field: "duplicateOf", code: "validation.present"}]);
      // Not a duplicate of oneself, nor of somebody who is not a client.
      await expectValidationError(await adminApi.delete(path, {duplicateOf: attending}, {allowFailure: true}), {
        field: "duplicateOf",
        code: "validation.not_in",
      });
      const notClient = await adminApi.delete(path, {duplicateOf: artifact().staffUserId}, {allowFailure: true});
      await expectValidationErrors(notClient, [{field: "duplicateOf", code: "validation.custom.member_exists"}]);
      expect(await clientExists(adminApi, facilityId, attending)).toBe(true);
      expect(await meetingClientIds(adminApi, facilityId, pastMeeting.id)).toEqual([attending]);
    });

    await test.step("deleted as a duplicate, the other client takes over the meeting", async () => {
      const res = await adminApi.delete(path, {duplicateOf: replacement});
      expect((await responseData<{clientDeleted: boolean}>(res)).clientDeleted).toBe(true);
      expect(await clientExists(adminApi, facilityId, attending)).toBe(false);
      expect(await clientExists(adminApi, facilityId, replacement)).toBe(true);
      expect(await meetingClientIds(adminApi, facilityId, pastMeeting.id)).toEqual([replacement]);
    });
  });

  test("deleting a duplicate attending the same meeting does not double the attendant", async ({api}) => {
    const {facilityId, adultClientInfos, childClientInfos, groupMeeting} = artifact();
    const adminApi = await api.loggedInAs(ADMIN);
    // Diana, Zoe and Will attend the group meeting.
    const [diana, zoe, will] = [adultClientInfos[3]!.id, childClientInfos[0]!.id, childClientInfos[1]!.id];
    expect((await meetingClientIds(adminApi, facilityId, groupMeeting.id)).toSorted()).toEqual(
      [diana, zoe, will].toSorted(),
    );
    await adminApi.delete(`facility/${facilityId}/user/client/${zoe}`, {duplicateOf: will});
    expect((await meetingClientIds(adminApi, facilityId, groupMeeting.id)).toSorted()).toEqual(
      [diana, will].toSorted(),
    );
  });
});
