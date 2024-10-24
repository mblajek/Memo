import {createCached} from "components/utils/cache";
import {Position} from "data-access/memo-api/dictionaries";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {DataRequest} from "data-access/memo-api/tquery/types";
import {DateTime} from "luxon";
import {createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

interface ClientData {
  readonly id: string;
  readonly type: Position;
  readonly birthDate: DateTime | undefined;
}

interface ClientRow {
  readonly "id": string;
  readonly "client.typeDictId": string;
  readonly "client.birthDate": string | null;
}

/** Returns a helper for getting some information about clients. Works in the context of the current facility. */
export const useClientsData = createCached(() => {
  const dictionaries = useDictionaries();
  const request: DataRequest = {
    columns: (["id", "client.typeDictId", "client.birthDate"] satisfies (keyof ClientRow)[]).map((column) => ({
      type: "column",
      column,
    })),
    sort: [],
    paging: {size: 1e6},
  };
  const {dataQuery} = createTQuery({
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/user/client`,
    prefixQueryKey: FacilityClient.keys.client(),
    requestCreator: staticRequestCreator(request),
    dataQueryOptions: () => ({
      enabled: !!dictionaries() && !!activeFacilityId(),
      staleTime: 3600 * 1000,
    }),
  });
  const rows = () => dataQuery.data?.data as ClientRow[] | undefined;
  const byId = createMemo(() => {
    if (!rows()) {
      return undefined;
    }
    const map = new Map<string, ClientRow>();
    for (const item of rows()!) {
      map.set(item.id, item);
    }
    return map;
  });
  return {
    isPending() {
      return !byId();
    },
    getById(userId: string): ClientData | undefined {
      const row = byId()?.get(userId);
      if (!row) {
        return undefined;
      }
      return {
        id: row.id,
        type: dictionaries()!.getPositionById(row["client.typeDictId"]),
        birthDate: row["client.birthDate"] ? DateTime.fromISO(row["client.birthDate"]) : undefined,
      };
    },
  };
});
