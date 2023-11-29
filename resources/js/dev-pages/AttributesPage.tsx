import {Title} from "@solidjs/meta";
import {createQuery} from "@tanstack/solid-query";
import {createSolidTable} from "@tanstack/solid-table";
import {IdentifiedColumnDef, createColumnHelper} from "@tanstack/table-core";
import {BigSpinner} from "components/ui/Spinner";
import {AUTO_SIZE_COLUMN_DEFS, Header, Table, cellFunc, getBaseTableOptions, useTableCells} from "components/ui/Table";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {QueryBarrier} from "components/utils";
import {Attribute, useAllAttributes} from "data-access/memo-api/attributes";
import {useAllDictionaries} from "data-access/memo-api/dictionaries";
import {System} from "data-access/memo-api/groups";
import {AttributeType} from "data-access/memo-api/resources/attribute.resource";
import {Show, VoidComponent, createMemo} from "solid-js";
import {Select} from "../components/ui/form/Select";
import {useAttrValueFormatter} from "./util";

export default (() => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  function getFacility(facilityId: string) {
    return facilitiesQuery.data?.find((f) => f.id === facilityId)?.name;
  }
  const attributes = useAllAttributes();
  const dictionaries = useAllDictionaries();

  const models = createMemo(() => [...new Set(Array.from(attributes() || [], (a) => a.model))].sort());

  const attrValueFormatter = useAttrValueFormatter();
  const tableCells = useTableCells();
  const h = createColumnHelper<Attribute>();

  function getAttributeTypeString(attr: Attribute) {
    if (attr.type === "dict") {
      return `dict: ${dictionaries()?.get(attr.dictionaryId!).resource.name}`;
    } else if (attr.typeModel) {
      return `model: ${attr.typeModel}`;
    } else {
      return attr.type;
    }
  }

  const textSort = {
    sortingFn: (a, b, colId) => ((a.getValue(colId) || "") as string).localeCompare(b.getValue(colId) || ""),
  } satisfies Partial<IdentifiedColumnDef<object>>;

  const table = createMemo(() =>
    createSolidTable({
      ...getBaseTableOptions<Attribute>({
        features: {
          sorting: [{id: "Label", desc: false}],
          pagination: {pageIndex: 0, pageSize: 1e6},
        },
        defaultColumn: AUTO_SIZE_COLUMN_DEFS,
      }),
      get data() {
        return [...(attributes() || [])];
      },
      columns: [
        h.accessor("id", {
          id: "Id",
          cell: tableCells.uuid,
          enableSorting: false,
          size: 60,
        }),
        h.accessor((a) => a.resource.name, {
          id: "Name",
          ...textSort,
        }),
        h.accessor("label", {
          id: "Label",
          cell: cellFunc<string>((l) => <div class="italic">{l}</div>),
          ...textSort,
        }),
        h.accessor("resource.isFixed", {
          id: "Fixed",
        }),
        h.accessor("resource.facilityId", {
          id: "Facility",
          cell: (ctx) => (
            <Show when={ctx.getValue()} fallback={EMPTY_VALUE_SYMBOL}>
              {(facilityId) => getFacility(facilityId())}
            </Show>
          ),
          ...textSort,
        }),
        h.accessor("model", {
          id: "Model",
          ...textSort,
          header: (ctx) => (
            <Header
              ctx={ctx}
              filter={
                <Select
                  name="modelFilter"
                  items={models().map((model) => ({value: model}))}
                  nullable
                  onValueChange={ctx.column.setFilterValue}
                  small
                />
              }
            />
          ),
          filterFn: (row, columnId, filter: string) => row.getValue(columnId) === filter,
        }),
        h.accessor("apiName", {
          id: "API name",
          ...textSort,
        }),
        h.accessor("type", {
          id: "Type",
          cell: cellFunc<AttributeType>((type, ctx) => <>{getAttributeTypeString(ctx.row.original as Attribute)}</>),
          ...textSort,
        }),
        h.accessor("multiple", {
          id: "Multiple",
          cell: cellFunc<boolean>(
            (multiple) => String(multiple),
            () => EMPTY_VALUE_SYMBOL,
          ),
        }),
        h.accessor("requirementLevel", {
          id: "Req. level",
          ...textSort,
        }),
        ...(attributes()
          ?.getForModel("attribute")
          .map((attr) =>
            h.accessor((row) => attr.readFrom(row.resource), {
              id: `@${attr.resource.name}`,
              cell: (ctx) => <>{attrValueFormatter(attr, ctx.getValue())}</>,
            }),
          ) || []),
      ],
    }),
  );

  return (
    <QueryBarrier queries={[facilitiesQuery]}>
      <Title>Attributes</Title>
      <div class="contents text-sm">
        <Show when={attributes()} fallback={<BigSpinner />}>
          <Table table={table()} mode="standalone" />
        </Show>
      </div>
    </QueryBarrier>
  );
}) satisfies VoidComponent;
