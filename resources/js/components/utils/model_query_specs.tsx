import {createQuery} from "@tanstack/solid-query";
import {BaseTQuerySelectProps, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {User} from "data-access/memo-api/groups";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {FacilityUsers} from "data-access/memo-api/groups/FacilityUsers";
import {Facilities} from "data-access/memo-api/groups/shared";
import {UserLink} from "features/facility-users/UserLink";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {DATE_FORMAT} from "./formatting";
import {useLangFunc} from "./lang";

export function useModelQuerySpecs() {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
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
          valueColumn: "id",
          extraColumns: ["client.typeDictId", "client.birthDate"],
          sort: [
            {type: "column", column: "name", desc: false},
            {type: "column", column: "client.birthDate", desc: true},
          ],
          itemFunc: (row, defItem) => {
            const birthDateStr = row.getStr("client.birthDate");
            const Link: VoidComponent = () => (
              <UserLink type="clients" userId={row.get("id")} name={row.get("name")} link={false} />
            );
            const Birthday: VoidComponent = () => (
              <div class="text-grey-text">
                <Show
                  when={birthDateStr}
                  fallback={<>{dictionaries()?.getPositionById(row.get("client.typeDictId")!).label}</>}
                >
                  {t("facility_user.birth_date_short", {
                    date: DateTime.fromISO(birthDateStr!).toLocaleString(DATE_FORMAT),
                  })}
                </Show>
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
