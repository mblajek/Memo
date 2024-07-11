import {useQueryClient} from "@tanstack/solid-query";
import {DateTime} from "luxon";
import {System, User} from "./groups";
import {FacilityMeeting} from "./groups/FacilityMeeting";
import {FacilityUsers} from "./groups/FacilityUsers";
import {Facilities, Users} from "./groups/shared";

let lastInvalidateEverythingTime: DateTime | undefined;

const INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS = 3000;

export function useInvalidator(queryClient = useQueryClient()) {
  function delayed<P extends unknown[]>(invalidationFn: (...params: P) => void) {
    // Use setTimeout to delay invalidations to avoid the bug causing queries to keep fetching
    // when they shouldn't in some situations. See https://github.com/TanStack/query/issues/7711
    return (...params: P) => setTimeout(() => invalidationFn(...params));
  }

  function everything() {
    lastInvalidateEverythingTime = DateTime.now();
    queryClient.invalidateQueries();
  }

  return {
    everything: delayed(everything),
    everythingThrottled: delayed(() => {
      if (
        !lastInvalidateEverythingTime ||
        Date.now() - lastInvalidateEverythingTime.toMillis() > INVALIDATE_EVERYTHING_LOOP_INTERVAL_MILLIS
      ) {
        everything();
        return true;
      }
      return false;
    }),
    // Shared:
    users: delayed(() => queryClient.invalidateQueries({queryKey: Users.keys.user()})),
    facilities: delayed(() => queryClient.invalidateQueries({queryKey: Facilities.keys.facility()})),
    // User status:
    userStatusAndFacilityPermissions: delayed(({clearCache = false} = {}) => {
      if (clearCache) {
        queryClient.resetQueries({queryKey: User.keys.statusAll()});
      } else {
        queryClient.invalidateQueries({queryKey: User.keys.statusAll()});
      }
    }),
    // System status:
    systemStatus: delayed(() => queryClient.invalidateQueries({queryKey: System.keys.status()})),
    // Facility resources:
    facility: {
      meetings: delayed(() => queryClient.invalidateQueries({queryKey: FacilityMeeting.keys.meeting()})),
      users: delayed(() => queryClient.invalidateQueries({queryKey: FacilityUsers.keys.user()})),
    },
    // Global:
    dictionaries: delayed(() => queryClient.invalidateQueries({queryKey: System.keys.dictionary()})),
    attributes: delayed(() => queryClient.invalidateQueries({queryKey: System.keys.attribute()})),
  };
}
