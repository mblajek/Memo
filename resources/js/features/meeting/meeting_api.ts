import {createMutation} from "@tanstack/solid-query";
import {FacilityMeeting, SeriesDeleteOption} from "data-access/memo-api/groups/FacilityMeeting";
import {MeetingResourceForCreate, MeetingResourceForPatch} from "data-access/memo-api/resources/meeting.resource";

export function useMeetingAPI() {
  const meetingCreateMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.createMeeting,
    meta: {isFormSubmit: true},
  }));
  const meetingCloneMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.cloneMeeting,
    meta: {isFormSubmit: true},
  }));
  const meetingUpdateMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.updateMeeting,
    meta: {isFormSubmit: true},
  }));
  const meetingDeleteMutation = createMutation(() => ({
    mutationFn: FacilityMeeting.deleteMeeting,
  }));

  return {
    async create(meeting: MeetingResourceForCreate, series?: FacilityMeeting.CloneRequest) {
      const {id} = (await meetingCreateMutation.mutateAsync(meeting)).data.data;
      const cloneIds = series?.dates.length
        ? (await meetingCloneMutation.mutateAsync({meetingId: id, request: series})).data.data.ids
        : undefined;
      return {id, cloneIds};
    },
    async update(id: string, meeting: Partial<MeetingResourceForPatch>) {
      await meetingUpdateMutation.mutateAsync({id, ...meeting});
    },
    async delete(id: string, deleteOption: SeriesDeleteOption) {
      const response = await meetingDeleteMutation.mutateAsync({meetingId: id, deleteOption});
      return {count: response.data.count};
    },
    isPending() {
      if (
        meetingCreateMutation.isPending ||
        meetingCloneMutation.isPending ||
        meetingUpdateMutation.isPending ||
        meetingDeleteMutation.isPending
      )
        return {
          create: meetingCreateMutation.isPending,
          clone: meetingCloneMutation.isPending,
          update: meetingUpdateMutation.isPending,
          delete: meetingDeleteMutation.isPending,
        };
      return undefined;
    },
  };
}
