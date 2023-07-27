import {CellContext, ColumnDefTemplate, IdentifiedColumnDef, RowData, createColumnHelper, createSolidTable, flexRender, getCoreRowModel} from "@tanstack/solid-table";
import {DATE_FORMAT, DATE_TIME_FORMAT, TranslationEntriesInterface, TranslationEntriesPrefix, useLangFunc} from "components/utils";
import {ColumnType, Filter, createTQuery, createTableRequestCreator, tableHelper} from "data-access/memo-api/tquery";
import {Component, For, Index, Show, createEffect, createMemo, on} from "solid-js";
import {Pagination, SortMarker, TableColumnVisibilityController, TableContextProvider, TableSearch, TableSummary, getHeaders, tableStyle as ts} from ".";
import {ColumnFilterController, Spinner} from "..";

/** Type of tquery-related information in column meta. */
export interface TQueryColumnMeta {
  type: ColumnType;
}

declare module '@tanstack/table-core' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    tquery?: TQueryColumnMeta;
  }
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
  /** Additional column names. Their options are taken from `columnOptions`. */
  additionalColumns?: string[];
  /** Overrides for the definition of specific columns. */
  columnOptions?: Partial<Record<string, ColumnOptions>>;
  initialVisibleColumns?: string[];
  initialPageSize?: number;
}

export const TQueryTable: Component<TQueryTableProps> = props => {
  const entityURL = props.staticEntityURL;
  const t = useLangFunc();
  // eslint-disable-next-line solid/reactivity
  const tt = TableTranslations.forPrefix(() => props.translations || "tables.tables.generic");

  const SORTABLE_COLUMN_TYPES = new Set<ColumnType>([
    "string", "decimal0", "decimal2", "bool", "date", "datetime",
  ]);

  type CellTemplate = ColumnDefTemplate<CellContext<object, unknown>>;

  function cellFunc<V>(func: (v: V) => CellTemplate | undefined):
    (c: CellContext<object, unknown>) => CellTemplate | undefined {
    return c => {
      const val = c.getValue();
      if (val === undefined)
        return undefined;
      return func(val as V);
    };
  }

  const COLUMN_CELL_BY_TYPE =
    new Map<ColumnType, CellTemplate>()
      .set("decimal0", cellFunc<number>(v => String(v)))
      .set("decimal2", cellFunc<number>(v => v.toFixed(2)))
      .set("bool", cellFunc<boolean>(v => v ? t("bool_values.yes") : t("bool_values.no")))
      .set("date", cellFunc<string>(v => DATE_FORMAT.format(new Date(v))))
      .set("datetime", cellFunc<string>(v => DATE_TIME_FORMAT.format(new Date(v))));

  const defaultCell: ColumnDefTemplate<CellContext<object, unknown>> = c => c.getValue();

  const requestCreator = createTableRequestCreator({
    intrinsicFilter: () => props.intrinsicFilter,
    additionalColumns: props.additionalColumns,
    initialVisibleColumns: props.initialVisibleColumns,
    initialPageSize: props.initialPageSize,
  });
  const {
    schema,
    requestController,
    dataQuery,
    data,
  } = createTQuery(entityURL, {requestCreator});
  const {
    columnVisibility: [columnVisibility, setColumnVisibility],
    globalFilter: [globalFilter, setGlobalFilter],
    columnFilters: [columnFilters, setColumnFilters],
    sorting: [sorting, setSorting],
    pagination: [pagination, setPagination],
  } = requestController;
  const {
    rowsCount,
    pageCount,
    scrollToTopSignal,
  } = tableHelper({
    requestController,
    response: () => dataQuery.data,
  });

  const h = createColumnHelper<object>();
  function commonColumnDef(name: string): Partial<IdentifiedColumnDef<object>> {
    return {
      header: t(`tables.headers.${name}`),
      ...props.columnOptions?.[name]?.columnDef,
    };
  }
  const columns = createMemo(() => {
    const sch = schema();
    if (sch) {
      const badColumns = new Set(Object.keys(props.columnOptions || {}));
      for (const {name} of sch.columns)
        badColumns.delete(name);
      for (const name of props.additionalColumns || [])
        badColumns.delete(name);
      if (badColumns.size)
        console.error(`Some columns are configured but not present in the columns list: ` +
          [...badColumns].join(", "));
      return [
        ...sch.columns.map(({type, name}) =>
          h.accessor(name, {
            enableSorting: SORTABLE_COLUMN_TYPES.has(type),
            cell: COLUMN_CELL_BY_TYPE.get(type) || defaultCell,
            meta: {
              tquery: {
                type,
              } satisfies TQueryColumnMeta,
            },
            ...commonColumnDef(name),
          })),
        ...(props.additionalColumns || []).map(name =>
          h.display({
            id: name,
            ...commonColumnDef(name),
          })
        ),
      ];
    }
    return [];
  });

  const table = createSolidTable({
    get data() {return data();},
    get columns() {return columns();},
    manualFiltering: true,
    manualSorting: true,
    maxMultiSortColCount: 2,
    enableSortingRemoval: false,
    manualPagination: true,
    columnResizeMode: "onChange",
    defaultColumn: {
      minSize: 50,
      size: 250,
    },
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
  createEffect(on(scrollToTopSignal, () => {
    scrollToTopPoint?.scrollIntoView({behavior: "smooth"});
  }));
  const gridTemplateColumns = () =>
    table.getVisibleLeafColumns().map(c => `${c.getSize()}px`).join(" ");

  return <TableContextProvider table={table}>
    <Show when={schema()} fallback={<Spinner />}>
      <div ref={scrollToTopPoint} class={ts.tableContainer}>
        <div class={ts.aboveTable}>
          <TableSearch />
          <TableColumnVisibilityController />
        </div>
        <div class={ts.tableBg}>
          <div class={ts.table} classList={{[ts.dimmed!]: dataQuery.isFetching}}
            style={{
              "grid-template-columns": gridTemplateColumns(),
            }}>
            <div class={ts.headerRow}>
              <For each={getHeaders(table)}>
                {({header, column}) => <Show when={header()}>
                  <div class={ts.cell}>
                    <span
                      class={ts.title}
                      classList={{"cursor-pointer": column.getCanSort()}}
                      onClick={e => {
                        e.preventDefault();
                        if (column.getCanSort())
                          column.toggleSorting(undefined, e.altKey);
                      }}
                      title={column.getCanSort() ? t("tables.sort_tooltip") : undefined}
                    >
                      {header()?.isPlaceholder ? undefined : flexRender(
                        column.columnDef.header,
                        header()!.getContext(),
                      )}
                      {" "}<SortMarker column={column} />
                    </span>
                    <Show when={column.getCanFilter()}>
                      <ColumnFilterController
                        name={column.id}
                        filter={columnFilters[column.id]}
                        setFilter={filter => setColumnFilters(column.id, filter)}
                      />
                    </Show>
                    <Show when={column.getCanResize()}>
                      <div class={ts.resizeHandler}
                        classList={{[ts.resizing!]: column.getIsResizing()}}
                        onMouseDown={header()?.getResizeHandler()}
                        onTouchStart={header()?.getResizeHandler()}
                      />
                    </Show>
                  </div>
                </Show>}
              </For>
            </div>
            <Index each={table.getRowModel().rows} fallback={
              <div class={ts.wideRow}>{
                dataQuery.isFetching ? <Spinner /> : tt.empty_table_text()
              }</div>
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
            <div class={ts.bottomBorder} />
          </div>
        </div>
        <div class={ts.belowTable}>
          <Pagination />
          <TableSummary summaryTranslation={tt.summary} rowsCount={rowsCount()} />
        </div>
      </div>
    </Show>
  </TableContextProvider>;
};
