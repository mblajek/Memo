import {Title} from "@solidjs/meta";
import {createQuery} from "@tanstack/solid-query";
import {createSolidTable} from "@tanstack/solid-table";
import {IdentifiedColumnDef, createColumnHelper} from "@tanstack/table-core";
import {AUTO_SIZE_COLUMN_DEFS, Table, cellFunc, getBaseTableOptions, useTableCells} from "components/ui/Table";
import {Show, VoidComponent} from "solid-js";
import {EMPTY_VALUE_SYMBOL} from "../components/ui/symbols";
import {QueryBarrier} from "../components/utils";
import {Attribute, useAllAttributes} from "../data-access/memo-api/attributes";
import {System} from "../data-access/memo-api/groups";
import {AttributeType} from "../data-access/memo-api/resources/attribute.resource";

export default (() => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  function getFacility(facilityId: string) {
    return facilitiesQuery.data?.find((f) => f.id === facilityId)?.name;
  }
  const attributes = useAllAttributes();
  const tableCells = useTableCells();
  const h = createColumnHelper<Attribute>();

  const textSort = {
    sortingFn: (a, b, colId) => ((a.getValue(colId) || "") as string).localeCompare(b.getValue(colId) || ""),
  } satisfies Partial<IdentifiedColumnDef<object>>;

  const table = createSolidTable({
    ...getBaseTableOptions<Attribute>({
      features: {
        sorting: [{id: "Label", desc: false}],
        pagination: {pageIndex: 0, pageSize: 1e6},
      },
      defaultColumn: AUTO_SIZE_COLUMN_DEFS,
    }),
    get data() {
      return [...(attributes()?.byId.values() || [])];
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
      }),
      h.accessor("apiName", {
        id: "API name",
        ...textSort,
      }),
      h.accessor("type", {
        id: "Type",
        cell: cellFunc<AttributeType>((type, ctx) => (
          <>
            {type}
            <Show when={type === "dict"}>: {(ctx.row.original as Attribute).dictionary!.resource.name}</Show>
          </>
        )),
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
    ],
  });
  return (
    <QueryBarrier queries={[facilitiesQuery]}>
      <Title>Attributes</Title>
      <Table table={table} mode="standalone" isLoading={!attributes()} />
    </QueryBarrier>
  );
}) satisfies VoidComponent;
