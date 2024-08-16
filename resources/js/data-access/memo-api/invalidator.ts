import {useQueryClient} from "@tanstack/solid-query";
import {DateTime} from "luxon";
import {System, User} from "./groups";
import {FacilityClientGroup} from "./groups/FacilityClientGroup";
import {FacilityMeeting} from "./groups/FacilityMeeting";
import {FacilityUsers} from "./groups/FacilityUsers";
import {Facilities, Users} from "./groups/shared";

let lastInvalidateEverythingTime: DateTime | undefined;

const INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS = 3000;

export function useInvalidator(queryClient = useQueryClient()) {
  function everything() {
    lastInvalidateEverythingTime = DateTime.now();
    queryClient.invalidateQueries();
  }
  return {
    everything: everything,
    everythingThrottled: () => {
      if (
        !lastInvalidateEverythingTime ||
        Date.now() - lastInvalidateEverythingTime.toMillis() > INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS
      ) {
        everything();
        return true;
      }
      return false;
    },
    // Shared:
    users: () => queryClient.invalidateQueries({queryKey: Users.keys.user()}),
    facilities: () => queryClient.invalidateQueries({queryKey: Facilities.keys.facility()}),
    // User status:
    userStatusAndFacilityPermissions: ({clearCache = false} = {}) => {
      if (clearCache) {
        queryClient.resetQueries({queryKey: User.keys.statusAll()});
      } else {
        queryClient.invalidateQueries({queryKey: User.keys.statusAll()});
      }
    },
    // System status:
    systemStatus: () => queryClient.invalidateQueries({queryKey: System.keys.status()}),
    // Facility resources:
    facility: {
      meetings: () => queryClient.invalidateQueries({queryKey: FacilityMeeting.keys.meeting()}),
      users: () => queryClient.invalidateQueries({queryKey: FacilityUsers.keys.user()}),
      clientGroups: () => queryClient.invalidateQueries({queryKey: FacilityClientGroup.keys.clientGroup()}),
    },
    // Global:
    dictionaries: () => queryClient.invalidateQueries({queryKey: System.keys.dictionary()}),
    attributes: () => queryClient.invalidateQueries({queryKey: System.keys.attribute()}),
  };
}
