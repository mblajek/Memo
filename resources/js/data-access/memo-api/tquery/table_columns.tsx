import {PartialColumnConfigEntry} from "components/ui/Table/TQueryTable";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {exportCellFunc} from "components/ui/Table/table_export_cells";
import {UuidSelectFilterControl} from "components/ui/Table/tquery_filters/UuidSelectFilterControl";
import {htmlAttributes} from "components/utils/html_attributes";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {objectRecursiveMerge} from "components/utils/object_util";
import {ParentComponent, Show, splitProps} from "solid-js";
import {DataItem} from "./types";

export function createTableColumnsSet<K extends string, T>(columns: Record<K, PartialColumnConfigEntry<T>>) {
  return {
    ...columns,
    getColumns() {
      return columns;
    },
    get(col: K, overrides?: Partial<PartialColumnConfigEntry<T>>) {
      const value = columns[col];
      return overrides ? objectRecursiveMerge<PartialColumnConfigEntry<T>>(value, overrides) : value;
    },
  };
}

type Entity = "staff" | "client";

export function useTableColumns() {
  const modelQuerySpecs = useModelQuerySpecs();

  function getColumnsSets(entity?: Entity) {
    const prefix = entity ? `${entity}.` : "";
    const columnsSet = createTableColumnsSet({
      createdAt: {
        name: `${prefix}createdAt`,
        columnDef: {sortDescFirst: true},
        initialVisible: false,
        globalFilterable: false,
      },
      createdBy: {
        name: `${prefix}createdBy.name`,
        initialVisible: false,
        globalFilterable: false,
      },
      updatedAt: {
        name: `${prefix}updatedAt`,
        columnDef: {sortDescFirst: true},
        initialVisible: false,
        globalFilterable: false,
      },
      updatedBy: {
        name: `${prefix}updatedBy.name`,
        initialVisible: false,
        globalFilterable: false,
      },
    });
    const globalAdminColumnsSet = createTableColumnsSet({
      ...columnsSet.getColumns(),
      createdBy: {
        name: `${prefix}createdBy.id`,
        extraDataColumns: [`${prefix}createdBy.name`],
        columnDef: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cell: cellFunc<string, any>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.row[`${prefix}createdBy.name`]}>{(v) => <>{v()}</>}</ShowCellVal>
            </PaddedCell>
          )),
          size: undefined,
        },
        filterControl: (props) => (
          <Show when={modelQuerySpecs.user()}>
            {(querySpecs) => <UuidSelectFilterControl {...props} {...querySpecs()} />}
          </Show>
        ),
        metaParams: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          textExportCell: exportCellFunc<string, string, any>(
            (v: string, ctx) => ctx.row[`${prefix}createdBy.name`] as string,
          ),
        },
        initialVisible: false,
        globalFilterable: false,
      },
      updatedBy: {
        name: `${prefix}updatedBy.id`,
        extraDataColumns: [`${prefix}updatedBy.name`],
        columnDef: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cell: cellFunc<string, any>((props) => (
            <PaddedCell>
              <ShowCellVal v={props.row[`${prefix}updatedBy.name`]}>{(v) => <>{v()}</>}</ShowCellVal>
            </PaddedCell>
          )),
          size: undefined,
        },
        filterControl: (props) => (
          <Show when={modelQuerySpecs.user()}>
            {(querySpecs) => <UuidSelectFilterControl {...props} {...querySpecs()} />}
          </Show>
        ),
        metaParams: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          textExportCell: exportCellFunc<string, string, any>(
            (v: string, ctx) => ctx.row[`${prefix}updatedBy.name`] as string,
          ),
        },
        initialVisible: false,
        globalFilterable: false,
      },
    });
    return {columnsSet, globalAdminColumnsSet};
  }

  const byEntity = new Map([
    [undefined, getColumnsSets()],
    ["staff" satisfies Entity as Entity, getColumnsSets("staff")],
    ["client" satisfies Entity as Entity, getColumnsSets("client")],
  ]);

  return {
    getCreatedUpdatedColumns<TData = DataItem>({
      entity,
      globalAdmin = false,
      overrides,
    }: {
      entity?: Entity;
      globalAdmin?: boolean;
      overrides?: Partial<PartialColumnConfigEntry<TData>>;
    } = {}) {
      const sets = byEntity.get(entity)!;
      const set = globalAdmin ? sets.globalAdminColumnsSet : sets.columnsSet;
      return (["createdAt", "createdBy", "updatedAt", "updatedBy"] as const).map((col) =>
        set.get(col, overrides as Partial<PartialColumnConfigEntry<unknown>>),
      ) as PartialColumnConfigEntry<TData>[];
    },
  };
}

export interface ScrollableCellProps extends htmlAttributes.div {
  readonly baseHeight?: string;
}

const DEFAULT_BASE_HEIGHT = "5rem";

/**
 * Table cell with the following properties:
 * - If content height is below base height, shrinks to content height.
 * - If content height is above base height, does not cause the row height to grow above base height,
 *   and gets a scrollbar.
 * - If the row is already higher than the base height (e.g. because another cell made it grow),
 *   this cell grows to use all the available height, possibly up to the point when scrolling is no
 *   longer needed.
 */
export const ScrollableCell: ParentComponent<ScrollableCellProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["baseHeight"]);
  return (
    <PaddedCell {...htmlAttributes.merge(divProps, {style: {"max-height": props.baseHeight || DEFAULT_BASE_HEIGHT}})} />
  );
};
