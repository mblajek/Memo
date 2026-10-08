import {dateOffset} from "../dates.ts";
import {createdId} from "../responses.ts";
import {STAFF_ADMIN} from "./facility.ts";
import {meetingsLayer, type MeetingInfo, type MeetingsArtifact} from "./meetings.ts";

const NOTIFICATION_TEMPLATE = "E2E reminder: {{meeting_datetime}}";

export type NotificationsArtifact = MeetingsArtifact & {
  /** The notification method all of this is about: the only one there is. */
  readonly smsMethodId: string;
  /** The clients with the SMS method set: Adam (has a phone number) and Carl (has none). */
  readonly notifiedClientIds: readonly string[];
  /**
   * A planned meeting in 10 days, 10:00–11:00, of STAFF with Adam (to be notified) and Bea (not).
   * Far enough for its notification to stay scheduled: nothing is ever due for sending.
   */
  readonly notifiedMeeting: MeetingInfo;
};

/**
 * Turns on meeting notifications: the facility gets a notification template, two clients the SMS
 * notification method, and one new meeting has a notification for a client.
 *
 * Notifications are sent by a backend job once their time comes, which is two days before the
 * meeting, so the tests must keep to meetings at least three days away — as the seeded
 * `futureMeeting` (in a week, with Carl, without a notification) is.
 */
export const notificationsLayer = meetingsLayer.createSubLayer<NotificationsArtifact>(
  "Notifications",
  async ({api, parentArtifact}) => {
    const {facilityId, staffUserId, adultClientInfos} = parentArtifact;
    await api.patch(`admin/facility/${facilityId}`, {meetingNotificationTemplateSubject: NOTIFICATION_TEMPLATE});
    await api.login(STAFF_ADMIN);
    const {notificationMethod, meetingType, meetingStatus, attendanceStatus} = await api.dictionaries();
    const smsMethodId = notificationMethod!.sms!;
    const [adam, bea, carl] = adultClientInfos;
    const notifiedClientIds = [adam!.id, carl!.id];
    for (const clientId of notifiedClientIds) {
      await api.patch(`facility/${facilityId}/user/client/${clientId}`, {
        client: {notificationMethodDictIds: [smsMethodId]},
      });
    }
    const ok = attendanceStatus!.ok!;
    const date = dateOffset(10);
    const id = await createdId(
      await api.createMeeting(facilityId, {
        typeDictId: meetingType!.other!,
        date,
        startDayminute: 600,
        durationMinutes: 60,
        statusDictId: meetingStatus!.planned!,
        staff: [{userId: staffUserId, attendanceStatusDictId: ok}],
        clients: [
          {userId: adam!.id, attendanceStatusDictId: ok, notifications: [{notificationMethodDictId: smsMethodId}]},
          {userId: bea!.id, attendanceStatusDictId: ok, notifications: []},
        ],
      }),
    );
    return {...parentArtifact, smsMethodId, notifiedClientIds, notifiedMeeting: {id, date, status: "planned"}};
  },
);
