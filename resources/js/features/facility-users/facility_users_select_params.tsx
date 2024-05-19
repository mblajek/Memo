import {BaseTQuerySelectProps, TQuerySelectDataRow} from "components/ui/form/TQuerySelect";
import {DATE_FORMAT, useLangFunc} from "components/utils";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {DateTime} from "luxon";
import {Accessor, createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {UserLink} from "./UserLink";

export function useFacilityUsersSelectParams() {
  const t = useLangFunc();
  const modelQuerySpecs = useModelQuerySpecs();
  const {dictionaries, attendanceTypeDict} = useFixedDictionaries();

  /**
   * Extension of a client select, providing priority items showing clients related to the specified users.\
   *
   * The result is reactive, which is needed if the parameter is reactive.
   */
  function autoRelatedClients(userIds: Accessor<readonly string[]>) {
    const userIdsMemo = createMemo(userIds, undefined, {
      equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
    });
    const result = createMemo(() =>
      userIdsMemo().length
        ? ({
            priorityQuerySpec: {
              entityURL: `facility/${activeFacilityId()}/meeting/attendant`,
              prefixQueryKey: FacilityMeeting.keys.meeting(),
              intrinsicFilter: {
                type: "op",
                op: "&",
                val: [
                  {
                    type: "column",
                    column: "attendant.attendanceTypeDictId",
                    op: "=",
                    val: attendanceTypeDict()!.client.id,
                  },
                  {
                    type: "column",
                    column: "attendants.*.userId",
                    op: "has_any",
                    val: userIdsMemo(),
                  },
                  {
                    type: "column",
                    column: "attendant.userId",
                    op: "in",
                    val: userIdsMemo(),
                    inv: true,
                  },
                ],
              },
              distinct: true,
              limit: 5,
              valueColumn: "attendant.userId",
              labelColumns: ["attendant.name"],
              sort: [
                {type: "column", column: "_count", desc: true},
                {type: "column", column: "attendant.name", desc: false},
              ],
              itemFunc: (row, defItem) => ({
                ...defItem(),
                requestReplacementWhenSelected: true,
              }),
            },
            mergeIntoPriorityItem: (priorityItem, regularItem) => regularItem,
          } satisfies Partial<BaseTQuerySelectProps>)
        : undefined,
    );
    return result;
  }

  return {
    /** The basis of a staff select, providing the query spec. */
    staffSelectParams: () => modelQuerySpecs.userStaff(),
    /** The basis of a client select, providing the query spec. */
    clientSelectParams: ({showBirthDateWhenSelected = false} = {}) => {
      const labelOnList = (row: TQuerySelectDataRow) => {
        const birthDateStr = row.get<string>("client.birthDate");
        return (
          <div class="flex gap-4 justify-between">
            <div>{row.get<string>("name")}</div>
            <div class="text-grey-text">
              {birthDateStr
                ? t("facility_user.birth_date_short", {
                    date: DateTime.fromISO(birthDateStr).toLocaleString(DATE_FORMAT),
                  })
                : dictionaries()?.getPositionById(row.get<string>("client.typeDictId")!).label}
            </div>
          </div>
        );
      };
      const label = showBirthDateWhenSelected ? labelOnList : (row: TQuerySelectDataRow) => row.get<string>("name");
      return {
        querySpec: {
          ...modelQuerySpecs.userClient().querySpec,
          valueColumn: "id",
          labelColumns: ["name", "client.typeDictId", "client.birthDate"],
          sort: [
            {type: "column", column: "name", desc: false},
            {type: "column", column: "client.birthDate", desc: true},
          ],
          itemFunc: (row, defItem) => ({
            ...defItem(),
            label: () => label(row),
            labelOnList: () => labelOnList(row),
          }),
        },
      } satisfies Partial<BaseTQuerySelectProps>;
    },
    staffAndClientsSelectParams: () => {
      return {
        querySpec: {
          ...modelQuerySpecs.userStaffOrClient().querySpec,
          valueColumn: "id",
          intrinsicFilter: {
            type: "op",
            op: "|",
            val: [
              {type: "column", column: "member.isStaff", op: "=", val: true},
              {type: "column", column: "member.isClient", op: "=", val: true},
            ],
          },
          sort: [{type: "column", column: "name", desc: false}],
          itemFunc: (row, defItem) => ({
            ...defItem(),
            label: () => <UserLink userId={row.get<string>("id")} link={false} />,
          }),
        },
      } satisfies Partial<BaseTQuerySelectProps>;
    },
    autoRelatedClients,
  };
}
