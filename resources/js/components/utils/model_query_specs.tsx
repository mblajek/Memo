import {createQuery} from "@tanstack/solid-query";
import {BaseTQuerySelectProps, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {User} from "data-access/memo-api/groups";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {FacilityUsers} from "data-access/memo-api/groups/FacilityUsers";
import {Facilities} from "data-access/memo-api/groups/shared";
import {ClientBirthDateShortInfo} from "features/client/ClientBirthDateShortInfo";
import {UserLink} from "features/facility-users/UserLink";
import {Show, VoidComponent} from "solid-js";
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
          {type: "column", column: "staff.deactivatedAt", desc: true},
          {type: "column", column: "name", desc: false},
        ],
        itemFunc: (row, defItem) => ({
          ...defItem,
          label: () => <UserLink type="staff" userId={row.get("id")} name={row.get("name")} link={false} />,
        }),
      },
    }),
    userClient: ({showBirthDateWhenSelected = false} = {}) => {
      return {
        querySpec: {
          entityURL: `facility/${activeFacilityId()}/user/client`,
          prefixQueryKey: FacilityClient.keys.client(),
          sort: [
            {type: "column", column: "name", desc: false},
            {type: "column", column: "client.birthDate", desc: true},
          ],
          itemFunc: (row, defItem) => {
            const Link: VoidComponent = () => (
              <UserLink type="clients" userId={row.get("id")} name={row.get("name")} link={false} />
            );
            const Birthday: VoidComponent = () => (
              <div class="text-grey-text">
                <ClientBirthDateShortInfo clientId={row.get("id")!} />
              </div>
            );
            return {
              ...defItem,
              label: () => (
                <div class="flex gap-4 justify-between">
                  <Link />
                  <Show when={showBirthDateWhenSelected}>
                    <Birthday />
                  </Show>
                </div>
              ),
              labelOnList: () => (
                <div class="flex gap-4 justify-between">
                  <Link />
                  <Birthday />
                </div>
              ),
            };
          },
        },
      } satisfies Partial<BaseTQuerySelectProps>;
    },
    userStaffOrClient: () => ({
      querySpec: {
        entityURL: `facility/${activeFacilityId()}/user`,
        prefixQueryKey: FacilityUsers.keys.user(),
        intrinsicFilter: {
          type: "op",
          op: "|",
          val: [
            {type: "column", column: "member.isStaff", op: "=", val: true},
            {type: "column", column: "member.isClient", op: "=", val: true},
          ],
        },
        itemFunc: (row, defItem) => ({
          ...defItem,
          label: () => <UserLink userId={row.get("id")} name={row.get("name")} link={false} />,
        }),
      },
    }),
  } satisfies Partial<Record<string, () => Pick<TQuerySelectProps, "querySpec"> | undefined>>;
}
