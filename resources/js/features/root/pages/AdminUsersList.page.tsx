import {createQuery} from "@tanstack/solid-query";
import {SortingState, createColumnHelper, createSolidTable, flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel} from "@tanstack/solid-table";
import {AccessBarrier, QueryBarrier} from "components/utils";
import {Admin} from "data-access/memo-api/groups/Admin";
import {Component, For, Show, createSignal} from "solid-js";
import {AdminUserResource} from "data-access/memo-api/resources/adminUser.resource";
import {TableContextProvider, TableSearch, tableStyle as ts} from "components/ui/Table";
import {DATE_TIME_FORMAT, NUMBER_FORMAT} from "components/utils/formatting";

export default (() => {
  const usersQuery = createQuery({
    queryFn: Admin.getUsers,
    queryKey: () => ["admin", "user", "list"],
  });

  const [sorting, setSorting] = createSignal<SortingState>(
    [{id: "name", desc: false}]);

  const h = createColumnHelper<AdminUserResource>();
  const columns = [
    h.accessor("name", {
      header: "Imię i nazwisko",
    }),
    h.accessor("email", {
      header: "E-mail",
      cell: info => <a href={`mailto:${info.getValue()}`} target="_blank">{info.getValue()}</a>,
    }),
    h.accessor(row => new Date(row.createdAt), {
      id: "createdAt",
      header: "Czas utworzenia",
      cell: info => DATE_TIME_FORMAT.format(info.getValue()),
      sortingFn: "datetime",
    }),
    h.accessor("hasGlobalAdmin", {
      header: "Globalny admin",
      cell: info => info.getValue() ? "💪" : "",
      invertSorting: true,
    }),
  ];
  console.log(columns);

  const table = createSolidTable({
    get data() {return usersQuery.data ?? [];},
    columns,
    getRowId: row => row.id,
    state: {
      get sorting() {return sorting();},
    },
    onSortingChange: setSorting,
    enableSortingRemoval: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    // TODO(tpreal): Extract reusable parts of the table to separate components.
    <AccessBarrier roles={["globalAdmin"]}>
      <QueryBarrier query={usersQuery}>
        <TableContextProvider table={table}>
          <div class="p-4">
            <h1 class="text-xl font-bold">Lista użytkowników</h1>
            <div class={ts.tableContainer}>
              <div class={ts.beforeTable}>
                <TableSearch />
              </div>
              <div class={ts.tableBg}>
                <div class={ts.table}
                  style={{
                    "grid-template-columns": `repeat(${table.getAllColumns().length}, auto)`,
                  }}>
                  <For each={table.getHeaderGroups()}>
                    {headerGroup => <div class={ts.headerRow}>
                      <For each={headerGroup.headers}>
                        {header => <span class={ts.cell}
                          classList={{"cursor-pointer": header.column.getCanSort()}}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {header.isPlaceholder ? undefined : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {{"": "", asc: " 🔼", desc: " 🔽"}[header.column.getIsSorted() || ""]}
                        </span>}
                      </For>
                    </div>}
                  </For>
                  <For each={table.getRowModel().rows}>
                    {row => <div class={ts.dataRow}>
                      <For each={row.getVisibleCells()}>
                        {cell => <span class={ts.cell}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </span>}
                      </For>
                    </div>}
                  </For>
                </div>
              </div>
              <div class={ts.tableSummary}>
                Liczba wierszy: {NUMBER_FORMAT.format(table.getRowModel().rows.length)}
                <Show when={table.getState().globalFilter || table.getState().columnFilters.length}>
                  <span> (liczba wszystkich: {
                    NUMBER_FORMAT.format(table.getCoreRowModel().rows.length)
                  })</span>
                </Show>
              </div>
            </div>
          </div>
        </TableContextProvider>
      </QueryBarrier>
    </AccessBarrier>
  );
}) satisfies Component;
