import {createMutation, createQuery} from "@tanstack/solid-query";
import {createCached} from "components/utils/cache";
import {Modifiable} from "components/utils/modifiable";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {MeetingResource, MeetingResourceForCreate} from "data-access/memo-api/resources/meeting.resource";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {Api} from "data-access/memo-api/types";
import {Accessor, createMemo, createSignal, onCleanup, onMount} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export const useMeetingsCache = createCached(() => {
  const [accessors, setAccessors] = createSignal<readonly Accessor<readonly TQMeetingResource[] | undefined>[]>([]);
  const meetingsById = createMemo((): ReadonlyMap<Api.Id, TQMeetingResource> => {
    const map = new Map<Api.Id, TQMeetingResource>();
    for (const accessor of accessors()) {
      for (const meeting of accessor() || []) {
        map.set(meeting.id, meeting);
      }
    }
    return map;
  });

  return {
    register(meetings: Accessor<readonly TQMeetingResource[] | undefined>) {
      onMount(() => {
        setAccessors((prev) => [...prev, meetings]);
        onCleanup(() => setAccessors((prev) => prev.filter((a) => a !== meetings)));
      });
    },
    get(meetingId: Api.Id) {
      return meetingsById().get(meetingId);
    },
  };
});

/** The meeting resource with additional fields fetched from */
export interface MeetingWithExtraInfo extends MeetingResource {
  readonly "seriesNumber"?: number;
  readonly "seriesCount"?: number;
  readonly "resourceConflicts.*.resourceDictId"?: readonly string[];
}

export function useMeetingWithExtraInfo(meetingId: string) {
  const {meetingTypeDict} = useFixedDictionaries();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(meetingId));
  const meetingsCache = useMeetingsCache();
  const cachedMeeting = () => meetingsCache.get(meetingId);
  const {dataQuery: meetingTQuery} = createTQuery({
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/meeting`,
    requestCreator: staticRequestCreator({
      columns: [
        {type: "column", column: "seriesNumber"},
        {type: "column", column: "seriesCount"},
        {type: "column", column: "resourceConflicts.*.resourceDictId"},
      ],
      filter: {type: "column", column: "id", op: "=", val: meetingId},
      sort: [],
      paging: {size: 1},
    }),
    dataQueryOptions: () => ({enabled: !cachedMeeting()}),
  });
  const meeting = createMemo((): MeetingWithExtraInfo | undefined => {
    const meeting = meetingQuery.data;
    if (!meeting) {
      return undefined;
    }
    const fullMeeting: Modifiable<MeetingWithExtraInfo> = {...meeting};
    const extraInfo: Partial<TQMeetingResource> | undefined = cachedMeeting() || meetingTQuery.data?.data[0];
    if (extraInfo) {
      fullMeeting.seriesNumber = extraInfo.seriesNumber ?? undefined;
      fullMeeting.seriesCount = extraInfo.seriesCount ?? undefined;
      fullMeeting["resourceConflicts.*.resourceDictId"] = extraInfo["resourceConflicts.*.resourceDictId"];
    }
    // Remove any series info for work time.
    if (fullMeeting.typeDictId === meetingTypeDict()?.work_time.id) {
      fullMeeting.fromMeetingId = null;
      fullMeeting.seriesNumber = undefined;
      fullMeeting.seriesCount = undefined;
      fullMeeting.interval = null;
    }
    return fullMeeting;
  });
  return {
    meetingQuery,
    meeting: meeting as Accessor<MeetingWithExtraInfo>,
  };
}

export const useMeetingAPI = createCached(() => {
  const meetingCreateMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.createMeeting,
    meta: {isFormSubmit: true},
  }));
  const meetingCloneMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.cloneMeeting,
    meta: {isFormSubmit: true},
  }));

  return {
    async create(meeting: MeetingResourceForCreate, series?: FacilityMeeting.CloneRequest) {
      const {id} = (await meetingCreateMutation.mutateAsync(meeting)).data.data;
      const cloneIds = series?.dates.length
        ? (await meetingCloneMutation.mutateAsync({id, request: series})).data.data.ids
        : undefined;
      return {id, cloneIds};
    },
  };
});
