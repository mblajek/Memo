import {activeFacilityId} from "state/activeFacilityId.state";
import {V1} from "../config";
import {SolidQueryOpts} from "../query_utils";
import {MeetingResource, MeetingResourceForCreate, MeetingResourceForPatch} from "../resources/meeting.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseGetListResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/Facility%20meeting production docs}
 * @see {@link http://localhost:9081/api/documentation#/Facility%20meeting local docs}
 */
export namespace FacilityMeeting {
  const getMeetingsListBase = (request: Api.Request.GetListParams, config?: Api.Config) =>
    V1.get<Api.Response.GetList<MeetingResource>>(`/facility/${activeFacilityId()}/meeting/list`, {
      ...config,
      params: request,
    });
  const getMeetingsList = (request: Api.Request.GetListParams, config?: Api.Config) =>
    getMeetingsListBase(request, config).then(parseGetListResponse);
  const getMeeting = createGetFromList(getMeetingsListBase);

  export const createMeeting = (meeting: MeetingResourceForCreate, config?: Api.Config) =>
    V1.post<Api.Response.Post>(`/facility/${activeFacilityId()}/meeting`, meeting, config);
  export const updateMeeting = (meeting: Api.Request.Patch<MeetingResourceForPatch>, config?: Api.Config) =>
    V1.patch(`/facility/${activeFacilityId()}/meeting/${meeting.id}`, meeting, config);
  export const deleteMeeting = (
    {meetingId, deleteOption}: {meetingId: Api.Id; deleteOption: SeriesDeleteOption},
    config?: Api.Config,
  ) => V1.delete(`/facility/${activeFacilityId()}/meeting/${meetingId}`, {...config, data: {series: deleteOption}});
  export const cloneMeeting = ({meetingId, request}: {meetingId: Api.Id; request: CloneRequest}, config?: Api.Config) =>
    V1.post<Api.Response.Post<CloneResponse>>(
      `/facility/${activeFacilityId()}/meeting/${meetingId}/clone`,
      request,
      config,
    );

  export type CloneInterval = "1d" | "7d" | "14d";

  export interface CloneRequest {
    readonly interval: CloneInterval;
    /** Dates of the clones of the meeting. */
    readonly dates: string[];
  }

  export interface CloneResponse {
    readonly ids: string[];
  }

  export const keys = {
    meeting: () => ["meeting"] as const,
    // The key contains the active facility id because the list depends on it.
    meetingList: (request: Api.Request.GetListParams) =>
      [...keys.meeting(), "list", request, activeFacilityId()] as const,
    // The key does not contain the facility id because it already contains the meeting id, which is already unique.
    meetingGet: (id: Api.Id) => [...keys.meeting(), "list", createListRequest(id)] as const,
  };

  export const meetingsQueryOptions = (ids: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: ({signal}) => getMeetingsList(request, {signal}),
      queryKey: keys.meetingList(request),
    } satisfies SolidQueryOpts<MeetingResource[]>;
  };

  export const meetingQueryOptions = (id: Api.Id) =>
    ({
      queryFn: ({signal}) => getMeeting(id, {signal}),
      queryKey: keys.meetingGet(id),
    }) satisfies SolidQueryOpts<MeetingResource>;
}

export type SeriesDeleteOption = "one" | "from_this" | "from_next" | "all";
