import {useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {BigSpinner} from "components/ui/Spinner";
import {QueryBarrier} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {UserDetailsHeader} from "features/facility-users/UserDetailsHeader";
import {UserMeetingsTables} from "features/facility-users/UserMeetingsTables";
import {useUserMeetingsStats} from "features/facility-users/user_meetings_stats";
import {Show, VoidComponent} from "solid-js";

export default (() => {
  const params = useParams();
  const userId = () => params.userId!;
  const dataQuery = createQuery(() => FacilityClient.clientQueryOptions(userId()));
  const meetingsStats = useUserMeetingsStats("clients", userId);
  return (
    <div class="m-2">
      <QueryBarrier queries={[dataQuery]} ignoreCachedData {...notFoundError()}>
        <Show when={dataQuery.data} fallback={<BigSpinner />}>
          {(user) => (
            <div class="flex flex-col items-stretch gap-2">
              <UserDetailsHeader type="clients" user={user()} />
              <UserMeetingsTables
                userName={user().name}
                userType="clients"
                intrinsicFilter={{
                  type: "column",
                  column: "attendant.userId",
                  op: "=",
                  val: userId(),
                }}
                staticPersistenceKey="clientMeetings"
                userMeetingsStats={meetingsStats}
              />
            </div>
          )}
        </Show>
      </QueryBarrier>
    </div>
  );
}) satisfies VoidComponent;
