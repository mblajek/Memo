import {useQueryClient} from "@tanstack/solid-query";
import {System, User} from "./groups";
import {FacilityClient} from "./groups/FacilityClient";
import {FacilityMeeting} from "./groups/FacilityMeeting";
import {FacilityStaff} from "./groups/FacilityStaff";
import {Facilities, Users} from "./groups/shared";

export function useInvalidator(queryClient = useQueryClient()) {
  return {
    // Shared:
    users: () => queryClient.invalidateQueries({queryKey: Users.keys.user()}),
    facilities: () => queryClient.invalidateQueries({queryKey: Facilities.keys.facility()}),
    // User status:
    userStatusAndFacilityPermissions: () => queryClient.invalidateQueries({queryKey: User.keys.statusAll()}),
    // Facility resources:
    facility: {
      meetings: () => queryClient.invalidateQueries({queryKey: FacilityMeeting.keys.meeting()}),
      staff: () => queryClient.invalidateQueries({queryKey: FacilityStaff.keys.staff()}),
      clients: () => queryClient.invalidateQueries({queryKey: FacilityClient.keys.client()}),
    },
    // Global:
    dictionaries: () => queryClient.invalidateQueries({queryKey: System.keys.dictionary()}),
    attributes: () => queryClient.invalidateQueries({queryKey: System.keys.attribute()}),
  };
}
