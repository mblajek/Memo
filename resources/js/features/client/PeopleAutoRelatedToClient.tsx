import {Capitalize} from "components/ui/Capitalize";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {SmallSpinner} from "components/ui/Spinner";
import {EmptyValueSymbol} from "components/ui/symbols";
import {title} from "components/ui/title";
import {QueryBarrier, useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {For, Show, VoidComponent, createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {UserLink} from "../facility-users/UserLink";

const _DIRECTIVES_ = null && title;

interface Props {
  readonly clientId: string;
}

/** Section listing staff and clients that were on the same meetings as the specified client. */
export const PeopleAutoRelatedToClient: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {attendanceTypeDict} = useFixedDictionaries();
  let countColumn: string | undefined;
  const relatedUsersQuery = createTQuery({
    entityURL: `facility/${activeFacilityId()}/meeting/attendant`,
    prefixQueryKey: FacilityMeeting.keys.meeting(),
    requestCreator: staticRequestCreator((schema) => {
      countColumn = schema.columns.find((c) => c.type === "count")!.name;
      return {
        columns: [
          {type: "column", column: "attendant.attendanceTypeDictId"},
          {type: "column", column: "attendant.userId"},
          {type: "column", column: "attendant.name"},
          {type: "column", column: countColumn},
        ],
        filter: {
          type: "column",
          column: "clients.*.userId",
          op: "has",
          val: props.clientId,
        },
        sort: [
          {type: "column", column: countColumn, desc: true},
          {type: "column", column: "attendant.name", desc: false},
        ],
        paging: {size: 50},
        distinct: true,
      };
    }),
    // No need to recalculate this often.
    dataQueryOptions: {staleTime: 3600 * 1000},
  });

  interface RelatedUser {
    readonly id: string;
    readonly name: string;
    readonly meetingsCount: number;
  }

  const relatedPeople = createMemo(() => {
    if (!attendanceTypeDict() || !relatedUsersQuery.dataQuery.data) {
      return undefined;
    }
    function getUsers(attendanceTypeId: string): readonly RelatedUser[] {
      const usersOfType = relatedUsersQuery.dataQuery.data!.data.filter(
        (user) =>
          user["attendant.userId"] !== props.clientId && user["attendant.attendanceTypeDictId"] === attendanceTypeId,
      );
      if (!usersOfType.length) {
        return [];
      }
      const maxCount = usersOfType[0]![countColumn!] as number;
      return usersOfType
        .filter((user) => (user[countColumn!] as number) >= 0.2 * maxCount)
        .map((user) => ({
          id: user["attendant.userId"] as string,
          name: user["attendant.name"] as string,
          meetingsCount: user[countColumn!] as number,
        }));
    }
    return {
      staff: getUsers(attendanceTypeDict()!.staff.id).slice(0, 8),
      clients: getUsers(attendanceTypeDict()!.client.id).slice(0, 10),
    };
  });

  return (
    <div class="flex flex-col">
      <StandaloneFieldLabel>
        <Capitalize text={t("facility_user.related_users")} />
      </StandaloneFieldLabel>
      <QueryBarrier queries={[relatedUsersQuery.dataQuery]} pending={() => <SmallSpinner />}>
        <Show when={relatedPeople()?.staff.length || relatedPeople()?.clients.length} fallback={<EmptyValueSymbol />}>
          <div class="flex flex-col gap-1">
            <For each={["staff", "clients"] as const}>
              {(type) => (
                <Show when={relatedPeople()![type].length}>
                  <div class="flex flex-wrap gap-x-2 text-sm">
                    <For each={relatedPeople()![type]}>
                      {(user) => (
                        <span>
                          <UserLink type={type} userId={user.id} name={user.name} />{" "}
                          <span class="text-grey-text" use:title={t("facility_user.related_user_meetings_count")}>
                            {t("parenthesised", {text: user.meetingsCount})}
                          </span>
                        </span>
                      )}
                    </For>
                  </div>
                </Show>
              )}
            </For>
          </div>
        </Show>
      </QueryBarrier>
    </div>
  );
};
