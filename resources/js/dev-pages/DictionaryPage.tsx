import {useParams} from "@solidjs/router";
import {useQuery} from "@tanstack/solid-query";
import {createSolidTable} from "@tanstack/solid-table";
import {createColumnHelper} from "@tanstack/table-core";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {BigSpinner} from "components/ui/Spinner";
import {AUTO_SIZE_COLUMN_DEFS, getBaseTableOptions, Table} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal, useTableCells} from "components/ui/Table/table_cells";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {Position} from "data-access/memo-api/dictionaries";
import {System} from "data-access/memo-api/groups/System";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createMemo, createSignal, Show, VoidComponent} from "solid-js";
import {useAllAttributes, useAllDictionaries} from "../data-access/memo-api/dictionaries_and_attributes_context";
import {filterByFacility, textSort, useAttrValueFormatter} from "./util";

export default (() => {
  const params = useParams();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  function getFacility(facilityId: string) {
    return facilitiesQuery.data?.find((f) => f.id === facilityId)?.name;
  }
  const dictionaries = useAllDictionaries();
  const attributes = useAllAttributes();
  const dictionary = () => dictionaries()?.get(params.dictionaryId!);
  const [onlyActiveFacility, setOnlyActiveFacility] = createSignal(false);
  createPersistence({
    value: onlyActiveFacility,
    onLoad: setOnlyActiveFacility,
    storage: localStorageStorage("DEVPages:onlyActiveFacility"),
  });
  const attrValueFormatter = useAttrValueFormatter();
  const tableCells = useTableCells();
  const h = createColumnHelper<Position>();

  const table = createMemo(() =>
    createSolidTable({
      ...getBaseTableOptions<Position>({
        features: {sorting: [{id: "Order", desc: false}]},
        defaultColumn: AUTO_SIZE_COLUMN_DEFS,
      }),
      data: filterByFacility(dictionary()?.allPositions, onlyActiveFacility()),
      columns: [
        h.accessor("id", {
          id: "Id",
          cell: tableCells.uuid(),
          enableSorting: false,
          size: 60,
        }),
        h.accessor((p) => p.resource.defaultOrder, {
          id: "Order",
          cell: cellFunc<number, Position>((props) => <PaddedCell class="text-right">{props.v}</PaddedCell>),
        }),
        h.accessor("resource.name", {
          id: "Name",
          ...textSort(),
        }),
        h.accessor("label", {
          id: "Label",
          cell: cellFunc<string, Position>((props) => <PaddedCell class="italic">{props.v}</PaddedCell>),
          ...textSort(),
        }),
        h.accessor("resource.facilityId", {
          id: "Facility",
          cell: cellFunc<string, Position>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.v}>{(v) => getFacility(v())}</ShowCellVal>
            </PaddedCell>
          )),
          ...textSort(),
        }),
        h.accessor("resource.isFixed", {
          id: "Fixed",
        }),
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
          dictionary()
            ?.resource.positionRequiredAttributeIds?.map((attrId) => attributes()!.getById(attrId))
            .sort((a, b) => a.resource.defaultOrder - b.resource.defaultOrder)
            .map((attr) =>
              h.accessor((p) => attr.readFrom(p.resource), {
                id: `@${attr.apiName}`,
                cell: (ctx) => <PaddedCell>{attrValueFormatter(attr, ctx.getValue())}</PaddedCell>,
              }),
            )) ||
          []),
      ],
    }),
  );

  return (
    <QueryBarrier queries={[facilitiesQuery]}>
      <AppTitlePrefix prefix="Dictionary" />
      <div class="contents text-sm">
        <Show when={dictionaries() && attributes()} fallback={<BigSpinner />}>
          <Table
            table={table()}
            mode="standalone"
            aboveTable={() => (
              <div class="flex gap-2 justify-between">
                <CheckboxInput
                  checked={onlyActiveFacility()}
                  onChecked={setOnlyActiveFacility}
                  label="Only active facility"
                />
                <div>
                  Dictionary: <b>{dictionary()?.name}</b>
                </div>
              </div>
            )}
          />
        </Show>
      </div>
    </QueryBarrier>
  );
}) satisfies VoidComponent;
