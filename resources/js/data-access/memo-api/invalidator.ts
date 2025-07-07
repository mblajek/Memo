import {useQueryClient} from "@tanstack/solid-query";
import {FacilityNotification} from "data-access/memo-api/groups/FacilityNotification";
import {System} from "data-access/memo-api/groups/System";
import {User} from "data-access/memo-api/groups/User";
import {createSignal, untrack} from "solid-js";
import {FacilityClientGroup} from "./groups/FacilityClientGroup";
import {FacilityMeeting} from "./groups/FacilityMeeting";
import {FacilityUsers} from "./groups/FacilityUsers";
import {Facilities, Users} from "./groups/shared";

const INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS = 3000;

const [throttled, setThrottled] = createSignal(false);

export function useInvalidator(queryClient = useQueryClient()) {
  const invalidate = {
    everything: () => {
      void queryClient.invalidateQueries();
      setThrottled(true);
      setTimeout(() => setThrottled(false), INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS);
    },
    everythingThrottled: () => {
      if (untrack(throttled)) {
        return false;
      }
      invalidate.everything();
      return true;
    },
    isThrottled: throttled,
    resetEverything: () => {
      void queryClient.resetQueries();
    },
    // Shared:
    users: () => void queryClient.invalidateQueries({queryKey: Users.keys.user()}),
    facilities: () => void queryClient.invalidateQueries({queryKey: Facilities.keys.facility()}),
    // User status:
    userStatusAndFacilityPermissions: ({clearCache = false} = {}) => {
      if (clearCache) {
        void queryClient.resetQueries({queryKey: User.keys.statusAll()});
      } else {
        void queryClient.invalidateQueries({queryKey: User.keys.statusAll()});
      }
    },
    // System status:
    systemStatus: () => void queryClient.invalidateQueries({queryKey: System.keys.status()}),
    // Facility resources:
    facility: {
      meetings: () => {
        void queryClient.invalidateQueries({queryKey: FacilityMeeting.keys.meeting()});
        // Also invalidate the notifications as they might be created from meetings.
        void queryClient.invalidateQueries({queryKey: FacilityNotification.keys.notification()});
      },
      users: () => void queryClient.invalidateQueries({queryKey: FacilityUsers.keys.user()}),
      clientGroups: () => {
        void invalidate.facility.users();
        void queryClient.invalidateQueries({queryKey: FacilityClientGroup.keys.clientGroup()});
      },
    },
    // Global:
    dictionaries: () => void queryClient.invalidateQueries({queryKey: System.keys.dictionary()}),
    attributes: () => void queryClient.invalidateQueries({queryKey: System.keys.attribute()}),
  };
  return invalidate;
}
