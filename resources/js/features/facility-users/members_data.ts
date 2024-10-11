import {createCached} from "components/utils/cache";
import {FacilityUsers} from "data-access/memo-api/groups/FacilityUsers";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {DataRequest} from "data-access/memo-api/tquery/types";
import {createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

interface UserMemberData {
  readonly id: string;
  readonly name: string;
  readonly isStaff: boolean;
  readonly isActiveStaff: boolean;
  readonly isClient: boolean;
  readonly hasFacilityAdmin: boolean;
  readonly hasGlobalAdmin: boolean;
}

interface MemberRow {
  readonly "id": string;
  readonly "name": string;
  readonly "member.isStaff": boolean;
  readonly "member.isActiveStaff": boolean;
  readonly "member.isClient": boolean;
  readonly "member.hasFacilityAdmin": boolean;
  readonly "hasGlobalAdmin": boolean;
}

/** Returns a helper for getting display name of users. Works in the context of the current facility. */
export const useMembersData = createCached(() => {
  const request: DataRequest = {
    columns: (
      [
        "id",
        "name",
        "member.isStaff",
        "member.isActiveStaff",
        "member.isClient",
        "member.hasFacilityAdmin",
        "hasGlobalAdmin",
      ] satisfies (keyof MemberRow)[]
    ).map((column) => ({type: "column", column})),
    sort: [],
    paging: {size: 1e6},
  };
  const {dataQuery} = createTQuery({
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/user`,
    prefixQueryKey: FacilityUsers.keys.user(),
    requestCreator: staticRequestCreator(request),
    dataQueryOptions: () => ({
      enabled: !!activeFacilityId(),
      staleTime: 3600 * 1000,
    }),
  });
  const rows = () => dataQuery.data?.data as MemberRow[] | undefined;
  const byId = createMemo(() => {
    if (!rows()) {
      return undefined;
    }
    const map = new Map<string, MemberRow>();
    for (const item of rows()!) {
      map.set(item.id, item);
    }
    return map;
  });
  return {
    isPending() {
      return !byId();
    },
    getById(userId: string): UserMemberData | undefined {
      const row = byId()?.get(userId);
      if (!row) {
        return undefined;
      }
      return {
        id: row.id,
        name: row.name,
        isStaff: row["member.isStaff"],
        isActiveStaff: row["member.isActiveStaff"],
        isClient: row["member.isClient"],
        hasFacilityAdmin: row["member.hasFacilityAdmin"],
        hasGlobalAdmin: row.hasGlobalAdmin,
      };
    },
  };
});
