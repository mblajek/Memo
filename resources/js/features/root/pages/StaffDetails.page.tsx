import {useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {BigSpinner} from "components/ui/Spinner";
import {QueryBarrier} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {UserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {Show, VoidComponent} from "solid-js";

export default (() => {
  const params = useParams();
  const userId = () => params.userId!;
  const dataQuery = createQuery(() => FacilityStaff.staffMemberQueryOptions(userId()));
  return (
    <div class="m-2">
      <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
        <Show when={dataQuery.data} fallback={<BigSpinner />}>
          {(user) => (
            <div class="flex flex-col items-stretch gap-2">
              <UserDetailsHeader type="staff" user={user()} />
              <UserMeetingsTables
                intrinsicFilter={{
                  type: "column",
                  column: "attendant.userId",
                  op: "=",
                  val: userId(),
                }}
                staticPersistenceKey="staffMeetings"
              />
            </div>
          )}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
