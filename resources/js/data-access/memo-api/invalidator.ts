import {useQueryClient} from "@tanstack/solid-query";
import {createSignal} from "solid-js";
import {System, User} from "./groups";
import {FacilityClientGroup} from "./groups/FacilityClientGroup";
import {FacilityMeeting} from "./groups/FacilityMeeting";
import {FacilityUsers} from "./groups/FacilityUsers";
import {Facilities, Users} from "./groups/shared";

const INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS = 3000;

export function useInvalidator(queryClient = useQueryClient()) {
  const [throttled, setThrottled] = createSignal(false);
  const invalidate = {
    everything: () => {
      queryClient.invalidateQueries();
      setThrottled(true);
      setTimeout(() => setThrottled(false), INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS);
    },
    everythingThrottled: () => {
      if (throttled()) {
        return false;
      }
      invalidate.everything();
      return true;
    },
    isThrottled: throttled,
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
      clientGroups: () => {
        invalidate.facility.users();
        queryClient.invalidateQueries({queryKey: FacilityClientGroup.keys.clientGroup()});
      },
    },
    // Global:
    dictionaries: () => queryClient.invalidateQueries({queryKey: System.keys.dictionary()}),
    attributes: () => queryClient.invalidateQueries({queryKey: System.keys.attribute()}),
  };
  return invalidate;
}
