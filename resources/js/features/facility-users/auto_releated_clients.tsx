import {BaseTQuerySelectProps} from "components/ui/form/TQuerySelect";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {FacilityMeeting} from "data-access/memo-api/groups/FacilityMeeting";
import {Accessor, createMemo} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export function useAutoRelatedClients() {
  const {attendanceTypeDict} = useFixedDictionaries();

  /**
   * Extension of a client select, providing priority items showing clients related to the specified users.
   *
   * The result is reactive, which is needed if the parameter is reactive.
   */
  function selectParamsExtension(userIds: Accessor<readonly string[]>) {
    const userIdsMemo = createMemo(userIds, undefined, {
      equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
    });
    const result = createMemo(() =>
      userIdsMemo().length
        ? ({
            priorityQuerySpec: {
              entityURL: () => activeFacilityId() && `facility/${activeFacilityId()}/meeting/attendant`,
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
              textColumn: "attendant.name",
              sort: [
                {type: "column", column: "_count", desc: true},
                {type: "column", column: "attendant.name", desc: false},
              ],
            },
            mergeIntoPriorityItem: (priorityItem, regularItem) => regularItem,
          } satisfies Partial<BaseTQuerySelectProps>)
        : undefined,
    );
    return result;
  }

  return {selectParamsExtension};
}
