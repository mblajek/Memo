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
  readonly columnFilterStates?: ReadonlyMap<ColumnName, ControlState | undefined>;
  readonly activeColumnGroups?: readonly string[];
  readonly sorting?: Readonly<SortingState>;
}

export namespace tableViewsSerialisation {
  interface TableViewForTable {
    readonly tableId?: string;
    readonly tableView: TableView;
  }

  export function codeSerialiser(): AsyncSerialiser<TableViewForTable> {
    const versionHeader = "A";
    type SerialisedTableViewForTable = {t?: string; v: RichJSONValue};
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
              v: intermediateSerialiser.serialise(view.tableView),
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
          tableView: intermediateSerialiser.deserialise(serialised.v),
        };
      },
    };
  }

  export function intermediateSerialiser(): Serialiser<TableView, RichJSONValue> {
    return {
      serialise(view) {
        const c: Record<ColumnName, SerialisedV2Column> = {};
        for (const [name, visibility] of Object.entries(view.columnVisibility || {})) {
          if (view.columnFilterStates?.has(name)) {
            const filterState = view.columnFilterStates.get(name);
            c[name] =
              filterState ||
              (visibility ? SerialisedV2ColumnEnum.SHOW_FILTER_CLEAR : SerialisedV2ColumnEnum.HIDE_FILTER_CLEAR);
          } else {
            c[name] = visibility ? SerialisedV2ColumnEnum.SHOW : SerialisedV2ColumnEnum.HIDE_FILTER_CLEAR;
          }
        }
        if (view.columnFilterStates) {
          for (const [name, filterState] of view.columnFilterStates) {
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
        const columnFilterStates = new Map<ColumnName, ControlState | undefined>();
        for (const [name, state] of Object.entries(c)) {
          if (state !== undefined) {
            const filterState = typeof state === "number" ? undefined : state;
            if (
              filterState ||
              state === SerialisedV2ColumnEnum.SHOW ||
              state === SerialisedV2ColumnEnum.SHOW_FILTER_CLEAR
            ) {
              visibility[name] = true;
            } else if (state === SerialisedV2ColumnEnum.HIDE_FILTER_CLEAR) {
              visibility[name] = false;
            }
            if (filterState) {
              columnFilterStates.set(name, filterState);
            } else if (
              state === SerialisedV2ColumnEnum.FILTER_CLEAR ||
              state === SerialisedV2ColumnEnum.HIDE_FILTER_CLEAR ||
              state === SerialisedV2ColumnEnum.SHOW_FILTER_CLEAR
            ) {
              columnFilterStates.set(name, undefined);
            }
          }
        }
        return {
          ...base,
          columnVisibility: Object.keys(visibility).length ? visibility : undefined,
          columnFilterStates: columnFilterStates.size ? columnFilterStates : undefined,
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

export function getTableViewDelta(currentView: TableView, newView: TableView) {
  let columnVisibility: VisibilityState | undefined;
  if (newView.columnVisibility) {
    columnVisibility = {};
    for (const [name, visibility] of Object.entries(newView.columnVisibility)) {
      if (visibility !== undefined && visibility !== currentView.columnVisibility?.[name]) {
        columnVisibility[name] = visibility;
      }
    }
  }
  let columnFilterStates: Map<ColumnName, ControlState | undefined> | undefined;
  if (newView.columnFilterStates) {
    columnFilterStates = new Map();
    for (const [name, filterState] of newView.columnFilterStates) {
      if (
        !currentView.columnFilterStates?.has(name) ||
        !richJSONValuesEqual(filterState ?? null, currentView.columnFilterStates.get(name) ?? null)
      ) {
        columnFilterStates.set(name, filterState);
      }
    }
  }
  const delta: TableView = {
    globalFilter:
      newView.globalFilter === undefined || newView.globalFilter === currentView.globalFilter
        ? undefined
        : newView.globalFilter,
    columnVisibility: columnVisibility && Object.keys(columnVisibility).length ? columnVisibility : undefined,
    columnFilterStates: columnFilterStates?.size ? columnFilterStates : undefined,
    activeColumnGroups:
      !newView.activeColumnGroups ||
      (currentView.activeColumnGroups && arraysEqual(currentView.activeColumnGroups, newView.activeColumnGroups))
        ? undefined
        : newView.activeColumnGroups,
    sorting:
      !newView.sorting || (currentView.sorting && arraysEqual(currentView.sorting, newView.sorting, objectsEqual))
        ? undefined
        : newView.sorting,
  };
  return {delta, deltaSummary: getTableViewSummary(delta)};
}

function getTableViewSummary(view: TableView): TableViewSummary {
  const globalFilter = view.globalFilter !== undefined;
  const columnVisibility = !!view.columnVisibility && Object.values(view.columnVisibility).some((v) => v !== undefined);
  const columnFilters = !!view.columnFilterStates && view.columnFilterStates.size > 0;
  const activeColumnGroups = !!view.activeColumnGroups;
  const sorting = !!view.sorting;
  return {
    globalFilter,
    columnVisibility,
    columnFilters,
    activeColumnGroups,
    sorting,
    anything: globalFilter || columnVisibility || columnFilters || activeColumnGroups || sorting,
  };
}

interface TableViewSummary {
  readonly globalFilter: boolean;
  readonly columnVisibility: boolean;
  readonly columnFilters: boolean;
  readonly activeColumnGroups: boolean;
  readonly sorting: boolean;
  readonly anything: boolean;
}
