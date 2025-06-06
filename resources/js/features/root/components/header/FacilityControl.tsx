import {useParams} from "@solidjs/router";
import {useQuery} from "@tanstack/solid-query";
import {Select} from "components/ui/form/Select";
import {createOneTimeEffect} from "components/utils/one_time_effect";
import {System} from "data-access/memo-api/groups/System";
import {User} from "data-access/memo-api/groups/User";
import {Match, Show, Switch, VoidComponent, createMemo} from "solid-js";
import {activeFacilityId, setActiveFacilityId} from "state/activeFacilityId.state";

export const FacilityControl: VoidComponent = () => {
  const params = useParams();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const statusQuery = useQuery(User.statusQueryOptions);
  const userFacilities = createMemo(() =>
    facilitiesQuery.data
      ?.filter((facility) =>
        statusQuery.data?.members.find(
          (member) => member.facilityId === facility.id && (member.hasFacilityAdmin || member.isActiveFacilityStaff),
        ),
      )
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  createOneTimeEffect({
    input: () => {
      const facilities = userFacilities();
      if (!facilities || !statusQuery.isSuccess) {
        return undefined;
      }
      // Use the facility from the URL, if not present (e.g. not on a facility-specific page) use the
      // last login facility, and finally use any (the first) facility so that some facility is always
      // selected.
      return (
        facilities.find(({url}) => url === params.facilityUrl) ||
        facilities.find(({id}) => id === statusQuery.data.user.lastLoginFacilityId) ||
        facilities[0]
      )?.id;
    },
    effect: (facilityId) => {
      setActiveFacilityId(facilityId);
      if (facilityId !== statusQuery.data!.user.lastLoginFacilityId) {
        void User.setLastLoginFacilityId(facilityId);
      }
    },
  });
  return (
    <Show when={userFacilities()}>
      {(userFacilities) => (
        <Switch>
          <Match when={userFacilities().length === 1}>
            <p class="font-semibold">{userFacilities()[0]!.name}</p>
          </Match>
          <Match when={userFacilities().length > 1}>
            <div class="min-w-32">
              <Select
                name="activeFacilityId"
                items={userFacilities().map(({id, name}) => ({
                  value: id,
                  label: () => <span class="font-semibold text-black">{name}</span>,
                }))}
                nullable={false}
                value={activeFacilityId()}
                onValueChange={(facilityId) => {
                  if (facilityId && facilityId !== activeFacilityId()) {
                    const url = userFacilities().find((facility) => facility.id === facilityId)?.url;
                    if (url) {
                      // Facility pages might assume that the active facility id never changes, because changing the facility
                      // always recreates the whole page by performing this navigation.
                      location.assign(`/${url}`);
                    }
                    void User.setLastLoginFacilityId(facilityId);
                  }
                }}
              />
            </div>
          </Match>
        </Switch>
      )}
    </Show>
  );
};
