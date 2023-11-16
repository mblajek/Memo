import {Title} from "@solidjs/meta";
import {createQuery} from "@tanstack/solid-query";
import {createSolidTable} from "@tanstack/solid-table";
import {ColumnHelper, IdentifiedColumnDef, createColumnHelper} from "@tanstack/table-core";
import {AUTO_SIZE_COLUMN_DEFS, Table, cellFunc, getBaseTableOptions, useTableCells} from "components/ui/Table";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {QueryBarrier} from "components/utils";
import {Dictionary, Position, useAllDictionaries} from "data-access/memo-api/dictionaries";
import {System} from "data-access/memo-api/groups";
import {Show, VoidComponent} from "solid-js";

export default (() => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  function getFacility(facilityId: string) {
    return facilitiesQuery.data?.find((f) => f.id === facilityId)?.name;
  }
  const dictionaries = useAllDictionaries();
  const tableCells = useTableCells();
  const h = createColumnHelper<Dictionary>();

  const textSort = {
    sortingFn: (a, b, colId) => ((a.getValue(colId) || "") as string).localeCompare(b.getValue(colId) || ""),
  } satisfies Partial<IdentifiedColumnDef<object>>;
  function getCommonColumns<E extends Dictionary | Position>(h: ColumnHelper<E>) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helper = h as ColumnHelper<any>;
    return [
      helper.accessor("id", {
        id: "Id",
        cell: tableCells.uuid,
        enableSorting: false,
        size: 60,
      }),
      h.accessor((d) => d.resource.name, {
        id: "Name",
        ...textSort,
      }),
      helper.accessor("label", {
        id: "Label",
        cell: cellFunc<string>((l) => <div class="italic">{l}</div>),
        ...textSort,
      }),
      helper.accessor("resource.facilityId", {
        id: "Facility",
        cell: (ctx) => (
          <Show when={ctx.getValue()} fallback={EMPTY_VALUE_SYMBOL}>
            {(facilityId) => getFacility(facilityId())}
          </Show>
        ),
        ...textSort,
      }),
    ];
  }
  function getBaseOpts<E extends Dictionary | Position>() {
    return getBaseTableOptions<E>({
      features: {
        sorting: [{id: "Label", desc: false}],
        pagination: {pageIndex: 0, pageSize: 1e6},
      },
      defaultColumn: AUTO_SIZE_COLUMN_DEFS,
    });
  }

  const table = createSolidTable({
    ...getBaseOpts(),
    get data() {
      return [...(dictionaries()?.byId.values() || [])];
    },
    columns: [
      ...getCommonColumns(h),
      h.accessor("allPositions", {
        id: "Positions",
        enableSorting: false,
        cell: (ctx) => {
          const h = createColumnHelper<Position>();
          const table = createSolidTable({
            ...getBaseOpts(),
            data: ctx.getValue(),
            columns: [
              ...getCommonColumns(h),
              h.accessor("disabled", {
                id: "Disabled",
              }),
            ],
          });
          return <Table table={table} />;
        },
      }),
    ],
  });
  return (
    <QueryBarrier queries={[facilitiesQuery]}>
      <Title>Dictionaries</Title>
      <Table table={table} mode="standalone" isLoading={!dictionaries()} />
    </QueryBarrier>
  );
}) satisfies VoidComponent;
