import {useNavigate, useParams} from "@solidjs/router";
import {createQuery} from "@tanstack/solid-query";
import {System, User} from "data-access/memo-api";
import {For, Match, Show, Switch, VoidComponent, createEffect, createMemo} from "solid-js";
import {activeFacilityId, setActiveFacilityId} from "state/activeFacilityId.state";

export const FacilityControl: VoidComponent = () => {
  const navigate = useNavigate();
  const params = useParams();

  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const statusQuery = createQuery(() => User.statusQueryOptions());

  const facilities = createMemo(
    () =>
      facilitiesQuery.data?.filter(
        (facility) => statusQuery.data?.members.find((member) => member.facilityId === facility.id),
      ),
  );

  // TODO: it just works, may be wrong. Maybe there is a better way of handling 'global mutable state' :D
  createEffect(() => {
    if (params.facilityUrl) {
      const facility = facilities()?.find((facility) => facility.url === params.facilityUrl);

      if (!facility) return;

      if (statusQuery.data?.members.find((member) => member.facilityId === facility.id))
        setActiveFacilityId(facility.id);
    }
  });

  // TODO: it just works, may be wrong. Maybe there is a better way of handling 'global mutable state' :D
  createEffect(() => {
    const facilitiesSub = facilities();
    if (facilitiesSub?.length === 1) setActiveFacilityId(facilitiesSub[0]?.id);
  });

  return (
    <Show when={facilities()}>
      {(facilities) => (
        <Switch>
          <Match when={facilities().length === 1}>
            <p>{facilities().at(0)?.name}</p>
          </Match>
          <Match when={facilities().length > 0}>
            <select
              class="mr-4"
              value={activeFacilityId()}
              onChange={(e) => {
                const url = facilities().find((facility) => facility.id === e.target.value)?.url;

                setActiveFacilityId(e.target.value);
                if (url) navigate(`/${url}/home`);
              }}
            >
              <For each={facilities()}>{(facility) => <option value={facility.id}>{facility.name}</option>}</For>
            </select>
          </Match>
        </Switch>
      )}
    </Show>
  );
};
