import {createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {FacilityClient} from "./groups/FacilityClient";
import {FacilityStaff} from "./groups/FacilityStaff";
import {createTQuery, staticRequestCreator} from "./tquery/tquery";
import {DataRequest} from "./tquery/types";

export type FacilityUserType = "staff" | "clients";

interface SimpleUser {
  id: string;
  name: string;
}

/** Returns a function for returning display name of users. Works in the context of the current facility. */
export function useUserDisplayNames() {
  const request: DataRequest = {
    columns: [
      {type: "column", column: "id"},
      {type: "column", column: "name"},
    ],
    sort: [],
    paging: {size: 1e6},
  };
  const staffQuery = createTQuery({
    entityURL: `facility/${activeFacilityId()}/user/staff`,
    prefixQueryKey: [FacilityStaff.keys.staff()],
    requestCreator: staticRequestCreator(request),
    dataQueryOptions: {refetchOnMount: false},
  });
  function byId(list: SimpleUser[] | undefined) {
    if (!list) {
      return undefined;
    }
    const map = new Map<string, string>();
    for (const item of list) {
      map.set(item.id, item.name);
    }
    return map;
  }
  const clientsQuery = createTQuery({
    entityURL: `facility/${activeFacilityId()}/user/client`,
    prefixQueryKey: [FacilityClient.keys.client()],
    requestCreator: staticRequestCreator(request),
    dataQueryOptions: {refetchOnMount: false},
  });
  const staff = createMemo(() => byId(staffQuery.dataQuery.data?.data as SimpleUser[] | undefined));
  const clients = createMemo(() => byId(clientsQuery.dataQuery.data?.data as SimpleUser[] | undefined));
  const users = {staff, clients};
  return {
    get(type: FacilityUserType, userId: string) {
      const map = users[type]();
      if (!map) {
        return undefined;
      }
      const displayName = map.get(userId);
      return {displayName, exists: !!displayName};
    },
  };
}
