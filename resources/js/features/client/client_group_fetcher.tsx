import {createQuery, keepPreviousData} from "@tanstack/solid-query";
import {delayedAccessor} from "components/utils";
import {createCached} from "components/utils/cache";
import {FacilityClientGroup} from "data-access/memo-api/groups/FacilityClientGroup";
import {Accessor, createEffect, createSignal, on, onCleanup} from "solid-js";

export const useClientGroupFetcher = createCached(() => {
  const [clientGroupsCounts, setClientGroupsCounts] = createSignal<ReadonlyMap<string, number>>(new Map());
  // eslint-disable-next-line solid/reactivity
  const delayedClientGroups = delayedAccessor((): readonly string[] => [...clientGroupsCounts().keys()], {timeMs: 100});
  const dataQuery = createQuery(() => ({
    ...FacilityClientGroup.clientGroupsQueryOptions(delayedClientGroups()),
    enabled: delayedClientGroups().length > 0,
    placeholderData: keepPreviousData,
  }));
  return {
    dataQuery,
    numSubscribedGroups: () => clientGroupsCounts().size,
    fetch(clientGroupId: string | Accessor<string | undefined>) {
      const clientGroupIdFunc = typeof clientGroupId === "string" ? () => clientGroupId : clientGroupId;
      createEffect(
        on(clientGroupIdFunc, (clientGroupId) => {
          if (clientGroupId) {
            const map = new Map(clientGroupsCounts());
            map.set(clientGroupId, (map.get(clientGroupId) || 0) + 1);
            setClientGroupsCounts(map);
            onCleanup(() => {
              const map = new Map(clientGroupsCounts());
              const count = map.get(clientGroupId)!;
              if (count === 1) {
                map.delete(clientGroupId);
              } else {
                map.set(clientGroupId, count - 1);
              }
              setClientGroupsCounts(map);
            });
          }
        }),
      );
      return () => dataQuery.data?.find((group) => group.id === clientGroupIdFunc());
    },
  };
});
