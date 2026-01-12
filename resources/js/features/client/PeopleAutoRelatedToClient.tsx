import {Button} from "components/ui/Button";
import {Capitalize} from "components/ui/Capitalize";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {StandaloneFieldLabel} from "components/ui/form/FieldLabel";
import {style} from "components/ui/inline_styles";
import {SmallSpinner} from "components/ui/Spinner";
import {title} from "components/ui/title";
import {cx} from "components/utils/classnames";
import {useLangFunc} from "components/utils/lang";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {useResizeObserver} from "components/utils/resize_observer";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {IoChevronCollapse, IoChevronExpand} from "solid-icons/io";
import {For, Show, VoidComponent, createMemo, createSignal} from "solid-js";
import {Dynamic} from "solid-js/web";
import {activeFacilityId} from "state/activeFacilityId.state";
import {UserLink} from "../facility-users/UserLink";

type _Directives = typeof title;

interface Props {
  readonly clientId: string;
}

/** Section listing staff and clients that were on the same meetings as the specified client. */
export const PeopleAutoRelatedToClient: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const {attendanceTypeDict} = useFixedDictionaries();
  const resizeObserver = useResizeObserver();
  let countColumn: string | undefined;
  const relatedUsersQuery = createTQuery({
    entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/meeting/attendant`,
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
        paging: {size: 200},
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
      return relatedUsersQuery.dataQuery
        .data!.data.filter(
          (user) =>
            user["attendant.userId"] !== props.clientId && user["attendant.attendanceTypeDictId"] === attendanceTypeId,
        )
        .map((user) => ({
          id: user["attendant.userId"] as string,
          name: user["attendant.name"] as string,
          meetingsCount: user[countColumn!] as number,
        }));
    }
    return {
      staff: getUsers(attendanceTypeDict()!.staff.id),
      clients: getUsers(attendanceTypeDict()!.client.id),
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
                <Show when={relatedPeople()![type].length ? relatedPeople()![type] : undefined}>
                  {(relatedUsers) => {
                    const [expanded, setExpanded] = createSignal(false);
                    const [container, setContainer] = createSignal<HTMLDivElement>();
                    // eslint-disable-next-line solid/reactivity
                    const isOverflowing = resizeObserver.observeTarget(
                      container,
                      (target) => target.scrollWidth > target.parentElement!.clientWidth,
                    );
                    return (
                      <div class="w-full flex justify-between text-sm">
                        <div
                          ref={setContainer}
                          class={cx("flex gap-x-2 overflow-clip min-w-0", expanded() ? "flex-wrap" : undefined)}
                        >
                          <For each={relatedUsers()}>
                            {(user) => (
                              <span class="whitespace-nowrap">
                                <UserLink type={type} userId={user.id} userName={user.name} allowWrap={false} />{" "}
                                <span class="text-grey-text" use:title={t("facility_user.related_user_meetings_count")}>
                                  {t("parenthesised", {text: user.meetingsCount})}
                                </span>
                              </span>
                            )}
                          </For>
                        </div>
                        <Show when={expanded() || isOverflowing()}>
                          <div class="flex">
                            <Show when={!expanded()}>
                              <div class="relative w-0 -left-12 h-full pointer-events-none">
                                <div
                                  class="w-12 h-full"
                                  {...style({background: "linear-gradient(to right, transparent, white)"})}
                                />
                              </div>
                            </Show>
                            <Button
                              class="minimal !px-1"
                              onClick={() => setExpanded(!expanded())}
                              title={expanded() ? undefined : t("actions.expand")}
                            >
                              <Dynamic
                                component={expanded() ? IoChevronCollapse : IoChevronExpand}
                                class="inlineIcon text-current text-gray-800"
                              />
                            </Button>
                          </div>
                        </Show>
                      </div>
                    );
                  }}
                </Show>
              )}
            </For>
          </div>
        </Show>
      </QueryBarrier>
    </div>
  );
};
