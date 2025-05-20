import {SortingState, VisibilityState} from "@tanstack/solid-table";
import {
  AsyncSerialiser,
  richJSONSerialiser,
  RichJSONValue,
  richJSONValuesEqual,
  Serialiser,
} from "components/persistence/serialiser";
import {ControlState} from "components/ui/Table/tquery_filters/types";
import {compressingEncoder} from "components/utils/encoding";
import {arraysEqual, objectsEqual} from "components/utils/object_util";
import {ColumnName} from "data-access/memo-api/tquery/types";

/**
 * The state of the table that can be saved and restored in another session, or even by another user.
 * All parts of the state are optional, so an "overlay" state can be persisted and then loaded.
 *
 * The page number is not saved, it is not part of the table view.
 */
export interface TableView {
  readonly globalFilter?: string;
  readonly columnVisibility?: Readonly<VisibilityState>;
  readonly columnFilters?: ReadonlyMap<ColumnName, ControlState | undefined>;
  readonly activeColumnGroups?: readonly string[];
  readonly sorting?: Readonly<SortingState>;
}

export namespace tableViewsSerialisation {
  interface TableViewForTable {
    readonly tableId?: string;
    readonly viewName?: string;
    readonly view: TableView;
  }

  export function codeSerialiser(): AsyncSerialiser<TableViewForTable> {
    const versionHeader = "A";
    type SerialisedTableViewForTable = {t?: string; n?: string; v: RichJSONValue};
    const intermediateSerialiser = tableViewsSerialisation.intermediateSerialiser();
    const jsonSerialiser = richJSONSerialiser<SerialisedTableViewForTable>();
    const encoder = compressingEncoder();
    return {
      async serialise(view: TableViewForTable) {
        return (
          versionHeader +
          (await encoder.serialise(
            jsonSerialiser.serialise({
              t: view.tableId || undefined,
              n: view.viewName || undefined,
              v: intermediateSerialiser.serialise(view.view),
            }),
          ))
        );
      },
      async deserialise(value): Promise<TableViewForTable> {
        if (!value.startsWith(versionHeader)) {
          throw new Error(`Bad version header`);
        }
        const serialised = jsonSerialiser.deserialise(await encoder.deserialise(value.slice(versionHeader.length)));
        return {
          tableId: serialised.t,
          viewName: serialised.n,
          view: intermediateSerialiser.deserialise(serialised.v),
        };
      },
    };
  }

  export function intermediateSerialiser(): Serialiser<TableView, RichJSONValue> {
    return {
      serialise(view) {
        const c: Record<ColumnName, SerialisedV2Column> = {};
        for (const [name, visibility] of Object.entries(view.columnVisibility || {})) {
          if (view.columnFilters?.has(name)) {
            const filterState = view.columnFilters.get(name);
            c[name] =
              filterState ||
              (visibility ? SerialisedV2ColumnEnum.SHOW_FILTER_CLEAR : SerialisedV2ColumnEnum.HIDE_FILTER_CLEAR);
          } else {
            c[name] = visibility ? SerialisedV2ColumnEnum.SHOW : SerialisedV2ColumnEnum.HIDE_FILTER_CLEAR;
          }
        }
        if (view.columnFilters) {
          for (const [name, filterState] of view.columnFilters) {
            if (!Object.hasOwn(c, name)) {
              c[name] = filterState || SerialisedV2ColumnEnum.FILTER_CLEAR;
            }
          }
        }
        return {
          v: 2,
          c,
          gf: view.globalFilter,
          cg: view.activeColumnGroups,
          s: view.sorting,
        } satisfies Serialised as unknown as RichJSONValue;
      },
      deserialise(value): TableView {
        const {c, gf, cg, s} = upgrade(value as unknown as SerialisedAny);
        const base = {
          globalFilter: gf,
          activeColumnGroups: cg,
          sorting: s,
        };
        if (!c) {
          return base;
        }
        const visibility: VisibilityState = {};
        const columnFilters = new Map<ColumnName, ControlState | undefined>();
        for (const [name, state] of Object.entries(c)) {
          if (state !== undefined) {
            const filterState = typeof state === "number" ? undefined : state;
            if (state === SerialisedV2ColumnEnum.SHOW || state === SerialisedV2ColumnEnum.SHOW_FILTER_CLEAR) {
              visibility[name] = true;
            } else if (state === SerialisedV2ColumnEnum.HIDE_FILTER_CLEAR) {
              visibility[name] = false;
            }
            if (filterState) {
              columnFilters.set(name, filterState);
            } else if (
              state === SerialisedV2ColumnEnum.FILTER_CLEAR ||
              state === SerialisedV2ColumnEnum.SHOW_FILTER_CLEAR
            ) {
              columnFilters.set(name, undefined);
            }
          }
        }
        return {
          ...base,
          columnVisibility: Object.keys(visibility).length ? visibility : undefined,
          columnFilters: columnFilters.size ? columnFilters : undefined,
        };
      },
    };
  }

  type Serialised = SerialisedV2;
  type SerialisedAny = SerialisedV2;

  function upgrade(view: SerialisedAny): Serialised {
    if (view.v === 2) {
      return view;
    }
    return view;
  }

  type SerialisedV2 = {
    readonly v: 2;
    /** Columns information. An empty column view object should be skipped. */
    readonly c?: Readonly<Record<ColumnName, SerialisedV2Column>>;
    /** Global filter. */
    readonly gf?: string;
    /** Active column groups. */
    readonly cg?: readonly string[];
    /** Sorting. */
    readonly s?: Readonly<SortingState>;
  };

  /**
   * The state of visibility and column filter. If a ControlState object, show the column and set
   * the filter state.
   */
  type SerialisedV2Column = SerialisedV2ColumnEnum | ControlState;

  enum SerialisedV2ColumnEnum {
    /** Hide the column (and clear the filter). */
    HIDE_FILTER_CLEAR = 0,
    /** Show the column, leave alone the filter (if the column was shown previously). */
    SHOW = 1,
    /** Show the column and clear the filter. */
    SHOW_FILTER_CLEAR = 2,
    /** Clear the filter and leave alone visibility (if it was visible previously). */
    FILTER_CLEAR = 3,
  }
}

/**
 * Returns a minimal set of changes needed to change the view from the base to the new. Components that
 * do not need to be modified (are compatible) are skipped.
 */
export function getTableViewDelta({baseView, newView}: {baseView: TableView; newView: TableView}): TableView {
  let columnVisibility: VisibilityState | undefined;
  if (newView.columnVisibility) {
    columnVisibility = {};
    for (const [name, visibility] of Object.entries(newView.columnVisibility)) {
      if (visibility !== undefined && visibility !== baseView.columnVisibility?.[name]) {
        columnVisibility[name] = visibility;
      }
    }
  }
  let columnFilters: Map<ColumnName, ControlState | undefined> | undefined;
  if (newView.columnFilters) {
    columnFilters = new Map();
    for (const [name, filterState] of newView.columnFilters) {
      if (
        !baseView.columnFilters?.has(name) ||
        !richJSONValuesEqual(filterState ?? null, baseView.columnFilters.get(name) ?? null)
      )
        columnFilters.set(name, filterState);
    }
  }
  return {
    globalFilter:
      newView.globalFilter === undefined || newView.globalFilter === baseView.globalFilter
        ? undefined
        : newView.globalFilter,
    columnVisibility: columnVisibility && Object.keys(columnVisibility).length ? columnVisibility : undefined,
    columnFilters: columnFilters?.size ? columnFilters : undefined,
    activeColumnGroups:
      !newView.activeColumnGroups ||
      (baseView.activeColumnGroups && arraysEqual(baseView.activeColumnGroups, newView.activeColumnGroups))
        ? undefined
        : newView.activeColumnGroups,
    sorting:
      !newView.sorting?.length || (baseView.sorting && arraysEqual(baseView.sorting, newView.sorting, objectsEqual))
        ? undefined
        : newView.sorting,
  };
}

/** Returns a summary of what is modified by this view. */
export function getTableViewModifiesSummary(view: TableView): TableViewSummary {
  return fillAny({
    globalFilter: view.globalFilter !== undefined,
    columnVisibility: !!view.columnVisibility && Object.values(view.columnVisibility).some((v) => v !== undefined),
    columnFilters: !!view.columnFilters && view.columnFilters.size > 0,
    activeColumnGroups: !!view.activeColumnGroups,
    sorting: !!view.sorting?.length,
  });
}

/** Returns a summary of whether the view would modify a cleared state. */
export function getTableViewModifiesClearedStateSummary(view: TableView): TableViewSummary {
  return fillAny({
    globalFilter: !!view.globalFilter,
    columnVisibility: true, // There is no such thing as cleared column visibility.
    columnFilters: !!view.columnFilters && [...view.columnFilters.values()].some((v) => v),
    activeColumnGroups: !!view.activeColumnGroups?.length,
    sorting: !!view.sorting?.length,
  });
}

function fillAny(view: Omit<TableViewSummary, "any">): TableViewSummary {
  return Object.assign(view, {any: Object.values(view).some((v) => v)});
}

export interface TableViewSummary {
  readonly globalFilter: boolean;
  readonly columnVisibility: boolean;
  readonly columnFilters: boolean;
  readonly activeColumnGroups: boolean;
  readonly sorting: boolean;
  readonly any: boolean;
}

export function getTableViewFullSummary({
  baseView,
  newView,
}: {
  baseView?: TableView;
  newView: TableView;
}): TableViewFullSummary {
  return {
    modifiesSummary: getTableViewModifiesSummary(newView),
    modifiesClearedSummary: getTableViewModifiesClearedStateSummary(newView),
    modifiesBaseSummary: baseView ? getTableViewModifiesSummary(getTableViewDelta({baseView, newView})) : undefined,
  };
}

export interface TableViewFullSummary {
  readonly modifiesSummary: TableViewSummary;
  readonly modifiesClearedSummary: TableViewSummary;
  readonly modifiesBaseSummary?: TableViewSummary;
}

export function getStencilledTableView({view, stencil}: {view: TableView; stencil: TableView}): TableView {
  const viewSummary = getTableViewModifiesSummary(view);
  const stencilSummary = getTableViewModifiesSummary(stencil);
  let columnVisibility: VisibilityState | undefined;
  let columnFilters: Map<ColumnName, ControlState | undefined> | undefined;
  if (viewSummary.columnVisibility && stencilSummary.columnVisibility) {
    columnVisibility = {};
    for (const column of Object.keys(stencil.columnVisibility!)) {
      const viewVisibility = view.columnVisibility![column];
      if (viewVisibility !== undefined) {
        columnVisibility[column] = viewVisibility;
      }
    }
  }
  if (viewSummary.columnFilters && stencilSummary.columnFilters) {
    columnFilters = new Map();
    for (const column of stencil.columnFilters!.keys()) {
      if (view.columnFilters!.has(column)) {
        columnFilters.set(column, view.columnFilters!.get(column));
      }
    }
  }
  return {
    globalFilter: stencilSummary.globalFilter ? view.globalFilter : undefined,
    columnVisibility: columnVisibility && Object.keys(columnVisibility).length ? columnVisibility : undefined,
    columnFilters: columnFilters?.size ? columnFilters : undefined,
    activeColumnGroups: stencilSummary.activeColumnGroups ? view.activeColumnGroups : undefined,
    sorting: stencilSummary.sorting ? view.sorting : undefined,
  };
}

export function isPartialTableViewSummary(summary: TableViewSummary) {
  return (
    !summary.globalFilter ||
    !summary.columnVisibility ||
    !summary.columnFilters ||
    !summary.activeColumnGroups ||
    !summary.sorting
  );
}
