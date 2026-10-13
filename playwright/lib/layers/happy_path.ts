import {createdId} from "../responses.ts";
import {STAFF_ADMIN} from "./facility.ts";
import {type MeetingsArtifact, meetingsLayer} from "./meetings.ts";

export const HAPPY_RESOURCES = {room: "E2E Room", projector: "E2E Projector"} as const;

/** The client attributes of the layer: their api names, which are also their names. */
export const HAPPY_ATTRS = {
  nickname: "e2eNickname",
  referredOn: "e2eReferredOn",
  consent: "e2eConsent",
  sessions: "e2eSessions",
  background: "e2eBackground",
  languages: "e2eLanguages",
  checkups: "e2eCheckups",
} as const;

export type HappyPathArtifact = MeetingsArtifact & {
  readonly resourceIds: {readonly room: string; readonly projector: string};
};

/**
 * A facility as on an ordinary day: on top of the staff, the clients, the meeting types and the
 * meetings, two meeting resources and seven optional client attributes: a text, a date, a yes/no, a
 * number, a text of several lines, a list of texts and a list of dates.
 */
export const happyPathLayer = meetingsLayer.createSubLayer<HappyPathArtifact>(
  "Happy Path",
  async ({api: globalAdminApi, parentArtifact}) => {
    const {facilityId} = parentArtifact;
    const api = await globalAdminApi.loggedInAs(STAFF_ADMIN);
    const adminPath = `facility/${facilityId}/admin`;
    const meetingResourceDictId = await api.dictionaryId("meetingResource");
    const createResource = async (name: string) =>
      createdId(
        await api.post(`${adminPath}/position`, {
          dictionaryId: meetingResourceDictId,
          name: `+${name}`,
          isDisabled: false,
        }),
      );
    const resourceIds = {
      room: await createResource(HAPPY_RESOURCES.room),
      projector: await createResource(HAPPY_RESOURCES.projector),
    };
    for (const [apiName, type, isMultiValue] of [
      [HAPPY_ATTRS.nickname, "string", false],
      [HAPPY_ATTRS.referredOn, "date", false],
      [HAPPY_ATTRS.consent, "bool", false],
      [HAPPY_ATTRS.sessions, "int", false],
      [HAPPY_ATTRS.background, "text", false],
      [HAPPY_ATTRS.languages, "string", true],
      [HAPPY_ATTRS.checkups, "date", true],
    ] as const) {
      await createdId(
        await api.post(`${adminPath}/attribute`, {
          model: "client",
          name: `+${apiName}`,
          apiName,
          type,
          dictionaryId: null,
          isMultiValue,
          requirementLevel: "optional",
          description: null,
        }),
      );
    }
    return {...parentArtifact, resourceIds};
  },
);
