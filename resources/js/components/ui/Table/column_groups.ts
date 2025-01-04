export interface ColumnGroup {
  readonly name: string;
  /** All the columns belonging to the group. */
  readonly columns: readonly string[];
  readonly forceShowColumns: readonly string[];
  readonly forceGroupByColumns: readonly string[];
  readonly isFromColumn: boolean;
}

/** The group or groups to which a column belongs. */
export type ColumnGroupParam = ColumnGroupInput | readonly ColumnGroupInput[];

const FORCE_GROUP_BY_COLUMN_PREFIX = ":";
const FORCE_SHOW_COLUMN_PREFIX = "::";

/**
 * The column group assigned to a column, expressed in a simplified form, using the prefixes.
 *
 * A string starting with ":" corresponds to setting forceGroupByColumn.
 * A string starting with "::" corresponds to setting forceShowColumn (and forceGroupByColumn as well).
 *
 * The value of true denotes a group created directly from the column, also setting forceShowColumn.
 */
type ColumnGroupInput = ColumnGroupInputInterface | string | true;

/** The column group assigned to a column. */
interface ColumnGroupInputInterface {
  readonly name: string;
  /** Whether the column is forced visible when using the grouping. Default: false. */
  readonly forceShowColumn?: boolean;
  /**
   * Whether the column must be used in grouping even if not visible when using the grouping.
   * For example meeting id should always be used for a "meeting" grouping, because date and time are
   * not unique.
   * Note that when forceShowColumn is specified, setting this is not necessary as the column will be
   * used in grouping anyway.
   * Default: false.
   */
  readonly forceGroupByColumn?: boolean;
  /** Whether the group is created directly from this column. This only affects presentation of the groups in the UI. */
  readonly isFromColumn?: boolean;
}

export class ColumnGroupsCollector {
  private readonly columnGroups = new Map<string, ColumnGroup>();

  column(columnName: string, columnGroups: ColumnGroupParam | undefined) {
    const columnGroupsArr: string[] = [];
    const add = (columnGroupInput: ColumnGroupInput) => {
      const {
        name: groupName,
        forceShowColumn = false,
        forceGroupByColumn = false,
        isFromColumn = false,
      } = columnGroupInput === true
        ? {name: columnName, forceShowColumn: true, isFromColumn: true}
        : typeof columnGroupInput === "string"
          ? columnGroupInput.startsWith(FORCE_SHOW_COLUMN_PREFIX)
            ? {name: columnGroupInput.slice(FORCE_SHOW_COLUMN_PREFIX.length), forceShowColumn: true}
            : columnGroupInput.startsWith(FORCE_GROUP_BY_COLUMN_PREFIX)
              ? {name: columnGroupInput.slice(FORCE_GROUP_BY_COLUMN_PREFIX.length), forceGroupByColumn: true}
              : {name: columnGroupInput}
          : columnGroupInput;
      columnGroupsArr.push(groupName);
      const existingGroup = this.columnGroups.get(groupName);
      const group = existingGroup
        ? {...existingGroup}
        : {name: groupName, columns: [], forceShowColumns: [], forceGroupByColumns: [], isFromColumn: false};
      group.columns = [...group.columns, columnName];
      if (forceShowColumn) {
        group.forceShowColumns = [...group.forceShowColumns, columnName];
      } else if (forceGroupByColumn) {
        group.forceGroupByColumns = [...group.forceGroupByColumns, columnName];
      }
      group.isFromColumn ||= isFromColumn;
      this.columnGroups.set(groupName, group);
    };
    if (columnGroups === true || typeof columnGroups === "string") {
      add(columnGroups);
    } else if (Array.isArray(columnGroups)) {
      for (const columnGroup of columnGroups) {
        add(columnGroup);
      }
    }
    return columnGroupsArr;
  }

  /**
   * Returns the encountered column groups, filtered by the selection. If the selection is not specified,
   * all the groups are returned.
   */
  getColumnGroups(selection?: ColumnGroupsSelection) {
    if (typeof selection === "boolean") {
      selection = {defaultInclude: selection};
    }
    const groups = [...this.columnGroups.values()];
    let selectedGroups;
    if (selection) {
      if (selection.overrides) {
        for (const [overrideGroup, overrideValue] of Object.entries(selection.overrides)) {
          // Only fail for missing positive overrides. Negative overrides can suppress e.g. attribute columns
          // that might be missing at some point.
          if (overrideValue && !this.columnGroups.has(overrideGroup)) {
            const message = `Override specified for unknown column: ${overrideGroup}`;
            console.error(message);
            throw new Error(message);
          }
        }
      }
      selectedGroups = groups.filter((group) => selection.overrides?.[group.name] ?? selection.defaultInclude ?? true);
    } else {
      selectedGroups = groups;
    }
    return selectedGroups;
  }
}

interface ColumnGroupsSelectionInterface {
  /** Whether to include the groups by default. Default: true. */
  readonly defaultInclude?: boolean;
  /** Whether to include the individual groups. */
  readonly overrides?: Partial<Record<string, boolean>>;
}

export type ColumnGroupsSelection = ColumnGroupsSelectionInterface | boolean;
