import { useNavigate, useParams } from "@solidjs/router";
import { createQuery, useQueryClient } from "@tanstack/solid-query";
import { FacilityResource, System, User } from "data-access/memo-api";
import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
} from "solid-js";
import { facilityId, setFacilityId } from "state/facilityId.state";

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
              value={facilityId()}
              onChange={(e) => {
                const url = facilities().find(
                  (facility) => facility.id === e.target.value
                )?.url;

                setFacilityId(e.target.value);
                if (url) navigate(`/${url}/home`);
              }}
            >
              <For each={facilities()}>
                {(facility) => (
                  <option value={facility.id}>{facility.name}</option>
                )}
              </For>
            </select>
          </Match>
        </Switch>
      )}
    </Show>
  );
};

const useFacilityControl = () => {
  const params = useParams();
  const queryClient = useQueryClient();

  const facilitiesQuery = createQuery(() => System.facilitiesQueryOptions());
  const statusQuery = createQuery(() => User.statusQueryOptions());

  const facilities = createMemo(() =>
    facilitiesQuery.data?.filter((facility) =>
      statusQuery.data?.members.find(
        (member) => member.facilityId === facility.id
      )
    )
  );

  createEffect(() => {
    if (params.facilityUrl) {
      const facilities = queryClient.getQueryData<FacilityResource[]>(
        System.facilitiesQueryOptions().queryKey
      );
      const facility = facilities?.find(
        (facility) => facility.url === params.facilityUrl
      );

      console.log(facility);
      if (!facility) return;

      const status = queryClient.getQueryData<User.GetStatusData>(
        User.keys.status()
      );

      if (status?.members.find((member) => member.facilityId === facility.id))
        setFacilityId(facility.id);
    }
  });

  createEffect(() => {
    if (facilities() && facilities()!.length === 1)
      setFacilityId(facilities()!.at(0)?.id);
  });

  return facilities;
};
