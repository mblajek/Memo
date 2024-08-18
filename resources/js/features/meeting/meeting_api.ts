import {createMutation, createQuery} from "@tanstack/solid-query";
import {createCached} from "components/utils/cache";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {MeetingResource, MeetingResourceForCreate} from "data-access/memo-api/resources/meeting.resource";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {activeFacilityId} from "state/activeFacilityId.state";

/** The meeting resource with additional fields fetched from */
export interface MeetingWithExtraInfo extends MeetingResource {
  readonly seriesNumber?: number;
  readonly seriesCount?: number;
}

export function useMeetingWithExtraInfo(meetingId: string) {
  const {meetingTypeDict} = useFixedDictionaries();
  const meetingQuery = createQuery(() => FacilityMeeting.meetingQueryOptions(meetingId));
  const {dataQuery: meetingTQuery} = createTQuery({
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    entityURL: `facility/${activeFacilityId()}/meeting`,
    requestCreator: staticRequestCreator({
      columns: [
        {type: "column", column: "seriesNumber"},
        {type: "column", column: "seriesCount"},
      ],
      filter: {type: "column", column: "id", op: "=", val: meetingId},
      sort: [],
      paging: {size: 1},
    }),
    dataQueryOptions: () => ({enabled: !!meetingQuery.data?.fromMeetingId}),
  });
  return {
    meetingQuery,
    meeting: (): MeetingWithExtraInfo => {
      const meeting = meetingQuery.data!;
      // Remove any series info for work time.
      if (meeting.typeDictId === meetingTypeDict()?.work_time.id) {
        return {...meeting, fromMeetingId: null, interval: null};
      }
      return {...meeting, ...meetingTQuery.data?.data[0]};
    },
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
