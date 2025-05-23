import {A} from "@solidjs/router";
import {useQuery} from "@tanstack/solid-query";
import {createSolidTable} from "@tanstack/solid-table";
import {createColumnHelper} from "@tanstack/table-core";
import {createPersistence} from "components/persistence/persistence";
import {localStorageStorage} from "components/persistence/storage";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {EmptyValueSymbol} from "components/ui/EmptyValueSymbol";
import {BigSpinner} from "components/ui/Spinner";
import {Header} from "components/ui/Table/Header";
import {AUTO_SIZE_COLUMN_DEFS, getBaseTableOptions, Table} from "components/ui/Table/Table";
import {cellFunc, PaddedCell, ShowCellVal, useTableCells} from "components/ui/Table/table_cells";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {Attribute} from "data-access/memo-api/attributes";
import {System} from "data-access/memo-api/groups/System";
import {AttributeType} from "data-access/memo-api/resources/attribute.resource";
import {AppTitlePrefix} from "features/root/AppTitleProvider";
import {createMemo, createSignal, Setter, Show, VoidComponent} from "solid-js";
import {Select} from "../components/ui/form/Select";
import {useAllAttributes} from "../data-access/memo-api/dictionaries_and_attributes_context";
import {filterByFacility, textSort, useAttrValueFormatter} from "./util";

export default (() => {
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  function getFacility(facilityId: string) {
    return facilitiesQuery.data?.find((f) => f.id === facilityId)?.name;
  }
  const attributes = useAllAttributes();
  const models = createMemo(() => [...new Set(Array.from(attributes() || [], (a) => a.model))].sort());
  const [onlyActiveFacility, setOnlyActiveFacility] = createSignal(false);
  createPersistence({
    value: onlyActiveFacility,
    onLoad: setOnlyActiveFacility,
    storage: localStorageStorage("DEVPages:onlyActiveFacility"),
  });
  const attrValueFormatter = useAttrValueFormatter();
  const tableCells = useTableCells();
  const h = createColumnHelper<Attribute>();

  function getAttributeTypeString(attr: Attribute) {
    if (attr.type === "dict") {
      return (
        <>
          dict: <A href={`../dictionaries/${attr.dictionary!.id}`}>{attr.dictionary!.name}</A>
        </>
      );
    } else if (attr.typeModel) {
      return `model: ${attr.typeModel}`;
    } else {
      return attr.type;
    }
  }

  const table = createMemo(() =>
    createSolidTable({
      ...getBaseTableOptions<Attribute>({
        features: {sorting: [{id: "Name", desc: false}]},
        defaultColumn: AUTO_SIZE_COLUMN_DEFS,
      }),
      get data() {
        return filterByFacility(attributes(), onlyActiveFacility());
      },
      columns: [
        h.accessor("id", {
          id: "Id",
          cell: tableCells.uuid(),
          enableSorting: false,
          size: 60,
        }),
        h.accessor((p) => p.resource.defaultOrder, {
          id: "Order",
          cell: cellFunc<number, Attribute>((props) => <PaddedCell class="text-right">{props.v}</PaddedCell>),
          sortDescFirst: false,
        }),
        h.accessor("name", {
          id: "Name",
          ...textSort(),
        }),
        h.accessor("label", {
          id: "Label",
          cell: cellFunc<string, Attribute>((props) => <PaddedCell class="italic">{props.v}</PaddedCell>),
          ...textSort(),
        }),
        h.accessor("resource.facilityId", {
          id: "Facility",
          cell: cellFunc<string, Attribute>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.v}>{(v) => getFacility(v())}</ShowCellVal>
            </PaddedCell>
          )),
          ...textSort(),
        }),
        h.accessor("isFixed", {
          id: "Fixed",
        }),
        h.accessor("model", {
          id: "Model",
          ...textSort(),
          header: (ctx) => (
            <Header
              ctx={ctx}
              filter={[ctx.column.getFilterValue, ctx.column.setFilterValue as Setter<unknown>]}
              filterControl={() => (
                <Select
                  name="modelFilter"
                  items={models().map((model) => ({value: model}))}
                  // Clearable by the "reset filter" button in the header.
                  nullable={false}
                  onValueChange={ctx.column.setFilterValue}
                  small
                />
              )}
            />
          ),
          filterFn: (row, columnId, filter: string) => row.getValue(columnId) === filter,
        }),
        h.accessor("apiName", {
          id: "API name",
          ...textSort(),
        }),
        h.accessor("type", {
          id: "Type",
          cell: cellFunc<AttributeType, Attribute>((props) => (
            <PaddedCell>{getAttributeTypeString(props.row as Attribute)}</PaddedCell>
          )),
          ...textSort(),
        }),
        h.accessor("multiple", {
          id: "Multiple",
          cell: cellFunc<boolean, Attribute>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.v} fallback={<EmptyValueSymbol />}>
                {(v) => String(v())}
              </ShowCellVal>
            </PaddedCell>
          )),
        }),
        h.accessor("requirementLevel", {
          id: "Req. level",
          ...textSort(),
        }),
        h.accessor("description", {
          id: "Description",
          cell: cellFunc<string, Attribute>((props) => (
            <PaddedCell class="whitespace-pre-wrap wrapText">
              <ShowCellVal v={props.v}>{(v) => v()}</ShowCellVal>
            </PaddedCell>
          )),
          ...textSort(),
          size: 400,
        }),
        ...(attributes()
          ?.getForModel("attribute")
          .map((attr) =>
            h.accessor((row) => attr.readFrom(row.resource), {
              id: `@${attr.name}`,
              cell: (ctx) => <PaddedCell>{attrValueFormatter(attr, ctx.getValue())}</PaddedCell>,
            }),
          ) || []),
      ],
    }),
  );

  return (
    <QueryBarrier queries={[facilitiesQuery]}>
      <AppTitlePrefix prefix="Attributes" />
      <div class="contents text-sm">
        <Show when={attributes()} fallback={<BigSpinner />}>
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
