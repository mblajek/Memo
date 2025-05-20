import {A} from "@solidjs/router";
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
import {Dictionary} from "data-access/memo-api/dictionaries";
import {System} from "data-access/memo-api/groups/System";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createMemo, createSignal, Show, VoidComponent} from "solid-js";
import {useAllAttributes, useAllDictionaries} from "../data-access/memo-api/dictionaries_and_attributes_context";
import {filterByFacility, textSort, useAttrValueFormatter} from "./util";

export default (() => {
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  function getFacility(facilityId: string) {
    return facilitiesQuery.data?.find((f) => f.id === facilityId)?.name;
  }
  const dictionaries = useAllDictionaries();
  const attributes = useAllAttributes();
  const [onlyActiveFacility, setOnlyActiveFacility] = createSignal(false);
  createPersistence({
    value: onlyActiveFacility,
    onLoad: setOnlyActiveFacility,
    storage: localStorageStorage("DEVPages:onlyActiveFacility"),
  });
  const attrValueFormatter = useAttrValueFormatter();
  const tableCells = useTableCells();
  const h = createColumnHelper<Dictionary>();

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
        h.accessor("id", {
          id: "Id",
          cell: tableCells.uuid(),
          enableSorting: false,
          size: 60,
        }),
        h.accessor("resource.name", {
          id: "Name",
          cell: cellFunc<string, Dictionary>((props) => (
            <PaddedCell>
              <A href={`./${props.row.id}`}>{props.v}</A>
            </PaddedCell>
          )),
          ...textSort(),
        }),
        h.accessor("label", {
          id: "Label",
          cell: cellFunc<string, Dictionary>((props) => <PaddedCell class="italic">{props.v}</PaddedCell>),
          ...textSort(),
        }),
        h.accessor("resource.facilityId", {
          id: "Facility",
          cell: cellFunc<string, Dictionary>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.v}>{(v) => getFacility(v())}</ShowCellVal>
            </PaddedCell>
          )),
          ...textSort(),
        }),
        h.accessor("resource.isFixed", {
          id: "Fixed",
        }),
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
        h.accessor((d) => d.allPositions.length, {
          id: "Pos. count",
          cell: cellFunc<number, Dictionary>((props) => <PaddedCell class="text-right">{props.v}</PaddedCell>),
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
