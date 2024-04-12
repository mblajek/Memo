import {useNavigate, useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {Select} from "components/ui/form/Select";
import {createOneTimeEffect} from "components/utils/one_time_effect";
import {System, User} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Match, Show, Switch, VoidComponent, createMemo} from "solid-js";
import {activeFacilityId, setActiveFacilityId} from "state/activeFacilityId.state";

export const FacilityControl: VoidComponent = () => {
  const navigate = useNavigate();
  const params = useParams();
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const statusQuery = createQuery(User.statusQueryOptions);
  const invalidate = useInvalidator();
  const userFacilities = createMemo(() =>
    facilitiesQuery.data
      ?.filter((facility) => statusQuery.data?.members.find((member) => member.facilityId === facility.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
  );
  createOneTimeEffect({
    input: () => {
      const facilities = userFacilities();
      if (!facilities || !statusQuery.isSuccess) {
        return undefined;
      }
      // Use the facility from the URL, if not present (e.g. not on a facility-specific page) use the
      // last login facility, and finally use any (the first) facility, so that some facility is always
      // selected.
      return (
        facilities.find(({url}) => url === params.facilityUrl) ||
        facilities.find(({id}) => id === statusQuery.data!.user.lastLoginFacilityId) ||
        facilities[0]
      )?.id;
    },
    effect: setActiveFacilityId,
  });
  return (
    <Show when={userFacilities()}>
      {(userFacilities) => (
        <Switch>
          <Match when={userFacilities().length === 1}>
            <p class="font-semibold">{userFacilities()[0]!.name}</p>
          </Match>
          <Match when={userFacilities().length > 1}>
            <Select
              name="activeFacilityId"
              items={userFacilities().map(({id, name}) => ({
                value: id,
                label: () => <span class="font-semibold">{name}</span>,
              }))}
              nullable={false}
              value={activeFacilityId()}
              onValueChange={(facilityId) => {
                if (facilityId) {
                  if (facilityId !== activeFacilityId()) {
                    setActiveFacilityId(facilityId);
                    const url = userFacilities().find((facility) => facility.id === facilityId)?.url;
                    if (url) {
                      // Facility pages might assume that the active facility id never changes, because changing the facility
                      // always recreates the whole page by performing this navigation.
                      navigate(`/${url}`);
                    }
                  }
                  if (facilityId !== statusQuery.data!.user.lastLoginFacilityId)
                    User.setLastLoginFacilityId(facilityId).then(() => invalidate.userStatusAndFacilityPermissions());
                }
              }}
            />
          </Match>
        </Switch>
      )}
    </Show>
  );
};
