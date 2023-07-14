import {CellContext, ColumnDefTemplate, IdentifiedColumnDef, createColumnHelper, createSolidTable, flexRender, getCoreRowModel} from "@tanstack/solid-table";
import {DATE_FORMAT, DATE_TIME_FORMAT, TranslationEntriesInterface, TranslationEntriesPrefix, useLangFunc} from "components/utils";
import {ColumnType, Filter, createTQuery, createTableRequestCreator, tableHelper} from "data-access/memo-api/tquery";
import {Component, For, Index, Show, createEffect, createMemo, on} from "solid-js";
import {Pagination, SortMarker, TableColumnVisibilityController, TableContextProvider, TableSearch, TableSummary, tableStyle as ts} from ".";

/** Type of tquery-related information stored in `column.meta.tquery`. */
export interface TQueryColumnMeta {
  type: ColumnType;
}

export interface ColumnOptions {
  columnDef?: Partial<IdentifiedColumnDef<object>>;
}

const TableTranslations = new TranslationEntriesInterface(
  // "No results" text.
  "empty_table_text",
  // Summary of the table, taking the number of rows as count.
  "summary",
);

export interface TQueryTableProps {
  /** The entity URL, must not change. */
  staticEntityURL: string;
  /**
   * The filter that is always applied to the data, regardless of other filtering.
   * This is used to create e.g. a table of entities A on the details page of a particular
   * entity B, so only entities A related direclty to that particular entity B should be shown.
   */
  intrinsicFilter?: Filter;
  /**
   * Prefix of the translation keys used in the table.
   * If not specified, a generic set of texts is used, e.g. "5 results". By specifying this
   * prefix, you can customise the table to show e.g. "5 users".
   */
  translations?: TranslationEntriesPrefix<typeof TableTranslations>;
  /** Overrides for the definition of specific columns. */
  columnOptions?: Partial<Record<string, ColumnOptions>>;
  initialPageSize?: number;
}

export const TQueryTable: Component<TQueryTableProps> = props => {
  const entityURL = props.staticEntityURL;
  const t = useLangFunc();
  // eslint-disable-next-line solid/reactivity
  const tt = TableTranslations.forPrefix(() => props.translations || "tables.tables.generic");
  const boolText = [t("tables.bool.no"), t("tables.bool.yes")];

  const SORTABLE_COLUMN_TYPES = new Set<ColumnType>([
    "string", "decimal0", "decimal2", "bool", "date", "datetime",
  ]);

  const COLUMN_CELL_BY_TYPE =
    new Map<ColumnType, ColumnDefTemplate<CellContext<object, unknown>>>()
      .set("bool", c => boolText[Number(c.getValue())])
      .set("date", c => {
        const v = c.getValue();
        return v && DATE_FORMAT.format(new Date(v as string));
      })
      .set("datetime", c => {
        const v = c.getValue();
        return v && DATE_TIME_FORMAT.format(new Date(v as string));
      });

  const defaultCell: ColumnDefTemplate<CellContext<object, unknown>> = c => c.getValue();

  const requestCreator = createTableRequestCreator({
    intrinsicFilter: () => props.intrinsicFilter,
    initialPageSize: props.initialPageSize,
  });
  const {
    schema,
    requestController,
    dataQuery,
    data,
    invalidate,
  } = createTQuery(entityURL, {requestCreator});
  const {
    columnVisibility: [columnVisibility, setColumnVisibility],
    sorting: [sorting, setSorting],
    globalFilter: [globalFilter, setGlobalFilter],
    pagination: [pagination, setPagination],
  } = requestController;
  const {
    rowsCount,
    pageCount,
    scrollToTop,
  } = tableHelper({
    schema,
    requestController,
    response: () => dataQuery.data,
  });

  const h = createColumnHelper<object>();
  const columns = createMemo(() =>
    (schema()?.columns || []).map(({type, name}) =>
      h.accessor(name, {
        header: t(`tables.headers.${name}`),
        enableSorting: SORTABLE_COLUMN_TYPES.has(type),
        cell: COLUMN_CELL_BY_TYPE.get(type) || defaultCell,
        meta: {
          tquery: {
            type,
          } satisfies TQueryColumnMeta,
        },
        ...props.columnOptions?.[name]?.columnDef,
      })));

  const table = createSolidTable({
    get data() {return data();},
    get columns() {return columns();},
    manualFiltering: true,
    manualSorting: true,
    maxMultiSortColCount: 2,
    enableSortingRemoval: false,
    manualPagination: true,
    get pageCount() {return pageCount();},
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    state: {
      get columnVisibility() {return columnVisibility();},
      get sorting() {return sorting();},
      get globalFilter() {return globalFilter();},
      get pagination() {return pagination();},
    },
    onColumnVisibilityChange: setColumnVisibility,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
  });

  let scrollToTopPoint: HTMLDivElement | undefined;
  createEffect(on(scrollToTop, () => {
    scrollToTopPoint?.scrollIntoView({behavior: "smooth"});
  }));

  return (
    <TableContextProvider table={table}>
      <div ref={scrollToTopPoint} class={ts.tableContainer}>
        <div class={ts.aboveTable}>
          <div class="flex-grow"><TableSearch /></div>
          <TableColumnVisibilityController />
        </div>
        <div class={ts.tableBg}>
          <div class={ts.table} classList={{[ts.dimmed!]: dataQuery.isFetching}}
            style={{
              "grid-template-columns": `repeat(${table.getVisibleLeafColumns().length}, auto)`,
            }}>
            <div class={ts.headerRow}>
              <For each={table.getLeafHeaders()}>
                {header => <Show when={header.column.getIsVisible()}>
                  <div class={ts.cell}>
                    <span classList={{"cursor-pointer": header.column.getCanSort()}}
                      onClick={e => {
                        e.preventDefault();
                        if (header.column.getCanSort())
                          header.column.toggleSorting(undefined, e.altKey);
                      }}>
                      {header.isPlaceholder ? undefined : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                      <span class="ml-1"><SortMarker column={header.column} /></span>
                    </span>
                  </div>
                </Show>}
              </For>
            </div>
            <Index each={table.getRowModel().rows} fallback={
              <div class={ts.wideRow}>
                {tt.empty_table_text()}
              </div>
            }>
              {row => <div class={ts.dataRow}>
                <Index each={row().getVisibleCells()}>
                  {cell => <span class={ts.cell}>
                    {flexRender(
                      cell().column.columnDef.cell,
                      cell().getContext(),
                    )}
                  </span>}
                </Index>
              </div>}
            </Index>
          </div>
        </div>
        <div class={ts.bottomBorder} />
        <div class={ts.belowTable}>
          <Pagination />
          <TableSummary summaryTranslation={tt.summary} rowsCount={rowsCount()} />
        </div>
      </div>
    </TableContextProvider>
  );
};
