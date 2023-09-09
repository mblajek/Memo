import {useNavigate, useParams} from "@solidjs/router";
import {createQuery, useQueryClient} from "@tanstack/solid-query";
import {FacilityResource, System, User} from "data-access/memo-api";
import {Component, For, Match, Show, Switch, createEffect, createMemo} from "solid-js";
import {activeFacilityId, setActiveFacilityId} from "state/activeFacilityId.state";

export const FacilityControl: Component = () => {
  const navigate = useNavigate();
  const facilities = useFacilityControl();

  return (
    <Show when={facilities()}>
      {(facilities) => (
        <Switch fallback={null}>
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

// TODO: it just works, may be wrong. Maybe there is a better way of handling 'global mutable state' :D
const useFacilityControl = () => {
  const params = useParams();
  const queryClient = useQueryClient();

  const facilitiesQuery = createQuery(() => System.facilitiesQueryOptions());
  const statusQuery = createQuery(() => User.statusQueryOptions());

  const facilities = createMemo(
    () =>
      facilitiesQuery.data?.filter(
        (facility) => statusQuery.data?.members.find((member) => member.facilityId === facility.id),
      ),
  );

  createEffect(() => {
    if (params.facilityUrl) {
      const facilities = queryClient.getQueryData<FacilityResource[]>(System.facilitiesQueryOptions().queryKey);
      const facility = facilities?.find((facility) => facility.url === params.facilityUrl);

      if (!facility) return;

      const status = queryClient.getQueryData<User.GetStatusData>(User.keys.status());

      if (status?.members.find((member) => member.facilityId === facility.id)) setActiveFacilityId(facility.id);
    }
  });

  createEffect(() => {
    const facilitiesSub = facilities();
    if (facilitiesSub?.length === 1) setActiveFacilityId(facilitiesSub.at(0)?.id);
  });

  return facilities;
};
