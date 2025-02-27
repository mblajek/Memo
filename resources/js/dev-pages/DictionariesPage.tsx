import {createQuery} from "@tanstack/solid-query";
import {createSolidTable} from "@tanstack/solid-table";
import {AccessorKeyColumnDefBase, ColumnHelper, createColumnHelper, IdentifiedColumnDef} from "@tanstack/table-core";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {BigSpinner} from "components/ui/Spinner";
import {Pagination} from "components/ui/Table/Pagination";
import {AUTO_SIZE_COLUMN_DEFS, getBaseTableOptions, Table} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal, useTableCells} from "components/ui/Table/table_cells";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {Dictionary, Position} from "data-access/memo-api/dictionaries";
import {System} from "data-access/memo-api/groups/System";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createMemo, createSignal, Show, VoidComponent} from "solid-js";
import {useAllAttributes, useAllDictionaries} from "../data-access/memo-api/dictionaries_and_attributes_context";
import {filterByFacility, useAttrValueFormatter} from "./util";

export default (() => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  function getFacility(facilityId: string) {
    return facilitiesQuery.data?.find((f) => f.id === facilityId)?.name;
  }
  const dictionaries = useAllDictionaries();
  const attributes = useAllAttributes();
  const [onlyActiveFacility, setOnlyActiveFacility] = createSignal(false);
  const attrValueFormatter = useAttrValueFormatter();
  const tableCells = useTableCells();
  const h = createColumnHelper<Dictionary>();

  function textSort<T>() {
    return {
      sortingFn: (a, b, colId) => ((a.getValue(colId) || "") as string).localeCompare(b.getValue(colId) || ""),
    } satisfies Partial<IdentifiedColumnDef<T>>;
  }

  function getCommonColumns<E extends Dictionary | Position>(h: ColumnHelper<E>): AccessorKeyColumnDefBase<E>[] {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const helper = h as ColumnHelper<any>;
    return [
      helper.accessor("id", {
        id: "Id",
        cell: tableCells.uuid(),
        enableSorting: false,
        size: 60,
      }),
      helper.accessor("resource.name", {
        id: "Name",
        ...textSort(),
      }),
      helper.accessor("label", {
        id: "Label",
        cell: cellFunc<string>((props) => <PaddedCell class="italic">{props.v}</PaddedCell>),
        ...textSort(),
      }),
      helper.accessor("resource.facilityId", {
        id: "Facility",
        cell: cellFunc<string>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.v}>{(v) => getFacility(v())}</ShowCellVal>
          </PaddedCell>
        )),
        ...textSort(),
      }),
      helper.accessor("resource.isFixed", {
        id: "Fixed",
      }),
    ];
  }

  const table = createMemo(() =>
    createSolidTable({
      ...getBaseTableOptions<Dictionary>({
        features: {sorting: [{id: "Name", desc: false}]},
        defaultColumn: AUTO_SIZE_COLUMN_DEFS,
      }),
      get data() {
        return filterByFacility(dictionaries(), onlyActiveFacility());
      },
      columns: [
        ...getCommonColumns(h),
        h.accessor("resource.isExtendable", {
          id: "Extendable",
        }),
        ...(attributes()
          ?.getForModel("dictionary")
          .map((attr) =>
            h.accessor((row) => attr.readFrom(row.resource), {
              id: `@${attr.apiName}`,
              cell: (ctx) => <PaddedCell>{attrValueFormatter(attr, ctx.getValue())}</PaddedCell>,
            }),
          ) || []),
        h.accessor("allPositions", {
          id: "Positions",
          enableSorting: false,
          cell: (ctx) => {
            const dict = ctx.row.original;
            const positions = ctx.getValue() as Position[];
            const h = createColumnHelper<Position>();
            const table = createSolidTable({
              ...getBaseTableOptions<Position>({
                features: {
                  sorting: [{id: "Order", desc: false}],
                  pagination: {pageIndex: 0, pageSize: 10},
                },
                defaultColumn: AUTO_SIZE_COLUMN_DEFS,
              }),
              data: filterByFacility(positions, onlyActiveFacility()),
              columns: [
                h.accessor((p) => p.resource.defaultOrder, {
                  id: "Order",
                  cell: cellFunc<number, Position>((props) => <PaddedCell class="text-right">{props.v}</PaddedCell>),
                }),
                ...getCommonColumns(h),
                h.accessor("disabled", {
                  id: "Disabled",
                }),
                h.accessor((p) => p.resource.positionGroupDictId, {
                  id: "Pos. group",
                  cell: cellFunc<string, Position>((props) => (
                    <PaddedCell>
                      <ShowCellVal v={props.v}>{(v) => dictionaries()?.getPositionById(v()).resource.name}</ShowCellVal>
                    </PaddedCell>
                  )),
                }),
                ...((attributes() &&
                  dict.resource.positionRequiredAttributeIds
                    ?.map((attrId) => attributes()!.getById(attrId)!)
                    .sort((a, b) => a.resource.defaultOrder - b.resource.defaultOrder)
                    .map((attr) =>
                      h.accessor((p) => attr.readFrom(p.resource), {
                        id: `@${attr.apiName}`,
                        cell: (ctx) => <PaddedCell>{attrValueFormatter(attr, ctx.getValue())}</PaddedCell>,
                      }),
                    )) ||
                  []),
              ],
            });
            return (
              <PaddedCell class="!p-1">
                <Table
                  table={table}
                  belowTable={() =>
                    positions.length ? (
                      <div class="flex items-stretch gap-1">
                        <Pagination />
                        <div class="flex items-center">Positions: {positions.length}</div>
                      </div>
                    ) : undefined
                  }
                />
              </PaddedCell>
            );
          },
        }),
      ],
    }),
  );

  return (
    <QueryBarrier queries={[facilitiesQuery]}>
      <AppTitlePrefix prefix="Dictionaries" />
      <div class="contents text-sm">
        <Show when={dictionaries() && attributes()} fallback={<BigSpinner />}>
          <Table
            table={table()}
            mode="standalone"
            aboveTable={() => (
              <CheckboxInput
                checked={onlyActiveFacility()}
                onChecked={setOnlyActiveFacility}
                label="Only active facility"
              />
            )}
          />
        </Show>
      </div>
    </QueryBarrier>
  );
}) satisfies VoidComponent;
