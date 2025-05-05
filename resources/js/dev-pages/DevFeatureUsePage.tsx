import {CellContext, createSolidTable} from "@tanstack/solid-table";
import {RichJSONValue} from "components/persistence/serialiser";
import {getWeekFromDay} from "components/ui/calendar/week_days_calculator";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {Select} from "components/ui/form/Select";
import {EN_DASH} from "components/ui/symbols";
import {AUTO_SIZE_COLUMN_DEFS, getBaseTableOptions, Table} from "components/ui/Table/Table";
import {PaddedCell} from "components/ui/Table/table_cells";
import {FormattedDateTime} from "components/utils/date_formatting";
import {BreakdownKey, FeatureUseContext} from "components/utils/feature_use_tracker";
import {featureUseTrackers} from "components/utils/feature_use_trackers";
import {DATE_FORMAT} from "components/utils/formatting";
import {currentDate} from "components/utils/time";
import {System} from "data-access/memo-api/groups/System";
import {createTQuery, staticRequestCreator} from "data-access/memo-api/tquery/tquery";
import {DateTime, WeekdayNumbers} from "luxon";
import {createMemo, createSignal, For, Show, VoidComponent} from "solid-js";

interface WeekData {
  readonly weekDate: DateTime;
  count: number;
  readonly countByWeekday: Map<WeekdayNumbers, number>;
  readonly countByKey: Map<string, number>;
}

export default (() => {
  const featureIds = featureUseTrackers.getFeatureIds();
  const [featureId, setFeatureId] = createSignal<string>();
  const {dataQuery} = createTQuery({
    prefixQueryKey: ["admin", "developer", "log"],
    entityURL: "admin/developer/log",
    requestCreator: staticRequestCreator(() =>
      featureId()
        ? {
            columns: [
              {type: "column", column: "message"},
              {type: "column", column: "context"},
            ],
            filter: {type: "column", column: "source", op: "=", val: System.LogAPIFrontendSource.FEATURE_USE},
            sort: [{type: "column", column: "createdAtDate", desc: true}],
            paging: {size: 10000},
          }
        : undefined,
    ),
  });
  function makeWeekData(weekDate: DateTime) {
    return {
      weekDate,
      count: 0,
      countByWeekday: new Map(),
      countByKey: new Map(),
    } satisfies WeekData;
  }
  const weeksData = createMemo((): WeekData[] => {
    if (!dataQuery.data || !featureId()) {
      return [];
    }
    const byWeekDate = new Map<number, WeekData>();
    const maxWeekDate = currentDate().startOf("week", {useLocaleWeeks: true});
    let minWeekDate = maxWeekDate;
    for (const row of dataQuery.data.data) {
      if (row.message !== featureId()) {
        continue;
      }
      const context = JSON.parse(row.context as string) as FeatureUseContext;
      const date = DateTime.fromISO(context.lastTime);
      const weekDate = getWeekFromDay(date).start;
      if (weekDate < minWeekDate) {
        minWeekDate = weekDate;
      }
      let data = byWeekDate.get(weekDate.toMillis());
      if (!data) {
        data = makeWeekData(weekDate);
        byWeekDate.set(weekDate.toMillis(), data);
      }
      data.count += context.count;
      data.countByWeekday.set(date.weekday, (data.countByWeekday.get(date.weekday) || 0) + context.count);
      for (const {key, count} of context.breakdown || []) {
        const keyStr = getKeyStr(key);
        data.countByKey.set(keyStr, (data.countByKey.get(keyStr) || 0) + count);
      }
    }
    const result: WeekData[] = [];
    for (let weekDate = maxWeekDate; weekDate >= minWeekDate; weekDate = weekDate.minus({weeks: 1})) {
      result.push(byWeekDate.get(weekDate.toMillis()) || makeWeekData(weekDate));
    }
    return result;
  });
  const table = createSolidTable({
    ...getBaseTableOptions<WeekData>({
      defaultColumn: {enableSorting: false, ...AUTO_SIZE_COLUMN_DEFS},
    }),
    get data() {
      return weeksData();
    },
    columns: [
      {
        id: "Week date",
        accessorFn: (d) => d.weekDate,
        cell: (ctx: CellContext<WeekData, DateTime>) => {
          const week = () => getWeekFromDay(ctx.getValue());
          return (
            <PaddedCell class="flex flex-col items-center">
              <span>{week().start.toLocaleString(DATE_FORMAT)}</span>
              <span class="-my-2">{EN_DASH}</span>
              <span>{week().end.toLocaleString(DATE_FORMAT)}</span>
            </PaddedCell>
          );
        },
      },
      {
        id: "By weekday",
        cell: (ctx: CellContext<WeekData, never>) => (
          <PaddedCell class="text-sm">
            <ul>
              <For each={[...getWeekFromDay(ctx.row.original.weekDate)].reverse()}>
                {(date) => (
                  <li class="flex justify-between gap-1">
                    <span>
                      <FormattedDateTime dateTime={date} format={{weekday: "short"}} alignWeekday />:
                    </span>
                    <span>{ctx.row.original.countByWeekday.get(date.weekday) || 0}</span>
                  </li>
                )}
              </For>
            </ul>
          </PaddedCell>
        ),
      },
      {
        id: "By key",
        cell: (ctx: CellContext<WeekData, never>) => (
          <PaddedCell class="text-sm">
            <Show
              when={ctx.row.original.countByKey.size ? ctx.row.original.countByKey : undefined}
              fallback={<EmptyValueSymbol />}
            >
              {(countByKey) => (
                <ul>
                  <For each={[...countByKey().keys()].sort()}>
                    {(key) => (
                      <li class="flex justify-between gap-1">
                        <span>{key}:</span>
                        <span>{countByKey().get(key)}</span>
                      </li>
                    )}
                  </For>
                </ul>
              )}
            </Show>
          </PaddedCell>
        ),
      },
    ],
    // meta: {translations},
  });
  return (
    <Table
      table={table}
      mode="standalone"
      isDimmed={dataQuery.isFetching}
      aboveTable={() => (
        <div class="flex gap-1">
          <Select
            name="featureId"
            items={featureIds.toSorted().map((featureId) => ({value: featureId}))}
            onFilterChange="internal"
            value={featureId()}
            onValueChange={setFeatureId}
            nullable={false}
          />
        </div>
      )}
    />
  );
}) satisfies VoidComponent;

function getKeyStr({path, details}: BreakdownKey) {
  function shortJSONString(v: RichJSONValue): string {
    if (Array.isArray(v)) {
      return `[${v.map(shortJSONString).join(",")}]`;
    } else if (v && typeof v === "object") {
      return `{${Object.entries(v)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => `${k}:${shortJSONString(v)}`)
        .join(", ")}}`;
    } else {
      return String(v);
    }
  }
  return [path, details === undefined ? undefined : shortJSONString(details)].filter((e) => e !== undefined).join(" ");
}
