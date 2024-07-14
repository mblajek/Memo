import {createQuery} from "@tanstack/solid-query";
import {TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {User} from "data-access/memo-api/groups";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {FacilityUsers} from "data-access/memo-api/groups/FacilityUsers";
import {Facilities} from "data-access/memo-api/groups/shared";
import {activeFacilityId} from "state/activeFacilityId.state";

export function useModelQuerySpecs() {
  const userStatus = createQuery(User.statusQueryOptions);
  const permissions = () => userStatus.data?.permissions;
  return {
    user: () => {
      if (!permissions()?.globalAdmin) {
        return undefined;
      }
      return {
        querySpec: {
          entityURL: "admin/user",
          prefixQueryKey: User.keys.all(),
        },
      };
    },
    facility: () => {
      if (!permissions()?.globalAdmin) {
        return undefined;
      }
      return {
        querySpec: {
          entityURL: "admin/facility",
          prefixQueryKey: Facilities.keys.facility(),
        },
      };
    },
    userStaff: () => ({
      querySpec: {
        entityURL: `facility/${activeFacilityId()}/user/staff`,
        prefixQueryKey: FacilityStaff.keys.staff(),
        sort: [
          {type: "column", column: "staff.isActive", desc: true},
          {type: "column", column: "name", desc: false},
          {type: "column", column: "staff.deactivatedAt", desc: true},
        ],
        extraColumns: ["staff.isActive"],
        itemFunc: (row, defItem) => ({
          ...defItem,
          label: () => <div class={row.get("staff.isActive") ? undefined : "text-grey-text"}>{defItem.text}</div>,
        }),
      },
    }),
    userClient: () => ({
      querySpec: {
        entityURL: `facility/${activeFacilityId()}/user/client`,
        prefixQueryKey: FacilityClient.keys.client(),
      },
    }),
    userStaffOrClient: () => ({
      querySpec: {
        entityURL: `facility/${activeFacilityId()}/user`,
        prefixQueryKey: FacilityUsers.keys.user(),
      },
    }),
  } satisfies Partial<Record<string, () => Pick<TQuerySelectProps, "querySpec"> | undefined>>;
}
