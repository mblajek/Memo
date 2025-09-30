import {V1} from "data-access/memo-api/config/v1.instance";
import {activeFacilityId} from "state/activeFacilityId.state";
import {SolidQueryOpts} from "../query_utils";
import {MeetingResource, MeetingResourceForCreate, MeetingResourceForPatch} from "../resources/meeting.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseListResponse} from "../utils";

/**
 * @see {@link http://localhost:9081/api/documentation#/Facility%20meeting local docs}
 */
export namespace FacilityMeeting {
  const getMeetingsListBase = (request: Api.Request.GetListParams, config?: Api.Config) =>
    V1.get<Api.Response.GetList<MeetingResource>>(`/facility/${activeFacilityId()}/meeting/list`, {
      ...config,
      params: request,
    });
  const getMeetingsList = (request: Api.Request.GetListParams, config?: Api.Config) =>
    getMeetingsListBase(request, config).then(parseListResponse);
  const getMeeting = createGetFromList(getMeetingsListBase);

  export const createMeeting = (meeting: MeetingResourceForCreate) =>
    V1.post<Api.Response.Post>(`/facility/${activeFacilityId()}/meeting`, meeting);
  export const updateMeeting = (meeting: Api.Request.Patch<MeetingResourceForPatch>) =>
    V1.patch(`/facility/${activeFacilityId()}/meeting/${meeting.id}`, meeting);

  export const deleteMeeting = ({id, request}: {id: Api.Id; request?: DeleteRequest}) =>
    V1.delete<Api.Response.Delete<DeleteResponse>>(`/facility/${activeFacilityId()}/meeting/${id}`, {data: request});

  export interface DeleteRequest {
    readonly series?: SeriesDeleteOption;
    readonly otherIds?: readonly Api.Id[];
  }

  export interface DeleteResponse {
    readonly count: number;
  }

  export const cloneMeeting = ({id, request}: {id: Api.Id; request: CloneRequest}) =>
    V1.post<Api.Response.Post<CloneResponse>>(`/facility/${activeFacilityId()}/meeting/${id}/clone`, request);

  export type CloneInterval = "1d" | "7d" | "14d";

  export interface CloneRequest {
    readonly interval: CloneInterval | null;
    /** Dates of the clones of the meeting. */
    readonly dates: readonly string[];
  }

  export interface CloneResponse {
    readonly ids: readonly string[];
  }

  export const getConflicts = (request: ConflictsRequest, config?: Api.Config) =>
    V1.post<Api.Response.List<SampleConflicts>>(
      `/facility/${activeFacilityId()}/meeting/conflicts`,
      request,
      config,
    ).then(parseListResponse);

  export interface ConflictsRequest {
    readonly samples: readonly ConflictsSample[];
    readonly staff?: boolean;
    readonly clients?: boolean;
    readonly resources?: boolean;
    readonly ignoreMeetingIds?: readonly Api.Id[];
  }

  export interface ConflictsSample {
    readonly date: string;
    readonly startDayminute: number;
    readonly durationMinutes: number;
  }

  export interface SampleConflicts {
    readonly staff?: readonly ConflictInfo[];
    readonly clients?: readonly ConflictInfo[];
    readonly resources?: readonly ConflictInfo[];
  }

  export interface ConflictInfo {
    readonly id: Api.Id;
    readonly meetingIds: readonly Api.Id[];
  }

  export const keys = {
    meeting: () => ["meeting"] as const,
    // The key contains the active facility id because the list depends on it.
    meetingList: (request: Api.Request.GetListParams) =>
      [...keys.meeting(), "list", request, activeFacilityId()] as const,
    // The key does not contain the facility id because it already contains the meeting id, which is already unique.
    meetingGet: (id: Api.Id) => [...keys.meeting(), "get", id] as const,
    conflicts: (request: ConflictsRequest) => [...keys.meeting(), "conflicts", request] as const,
  };

  export const meetingsQueryOptions = (ids: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: ({signal}) => getMeetingsList(request, {signal}),
      queryKey: keys.meetingList(request),
    } satisfies SolidQueryOpts<readonly MeetingResource[]>;
  };

  export const meetingQueryOptions = (id: Api.Id) =>
    ({
      queryFn: ({signal}) => getMeeting(id, {signal}),
      queryKey: keys.meetingGet(id),
    }) satisfies SolidQueryOpts<MeetingResource>;

  export const conflictsQueryOptions = (request: ConflictsRequest) =>
    ({
      queryFn: ({signal}) => getConflicts(request, {signal}),
      queryKey: keys.conflicts(request),
    }) satisfies SolidQueryOpts<readonly SampleConflicts[]>;
}

export type SeriesDeleteOption = "one" | "from_this" | "from_next" | "all";
