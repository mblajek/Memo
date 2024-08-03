import {PaddedCell, ShowCellVal, cellFunc} from "components/ui/Table";
import {PartialColumnConfigEntry} from "components/ui/Table/TQueryTable";
import {exportCellFunc} from "components/ui/Table/table_export_cells";
import {UuidSelectFilterControl} from "components/ui/Table/tquery_filters/UuidSelectFilterControl";
import {htmlAttributes} from "components/utils";
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
      createdBy: {name: `${prefix}createdBy.name`, initialVisible: false, globalFilterable: false},
      updatedAt: {
        name: `${prefix}updatedAt`,
        columnDef: {sortDescFirst: true},
        initialVisible: false,
        globalFilterable: false,
      },
      updatedBy: {name: `${prefix}updatedBy.name`, initialVisible: false, globalFilterable: false},
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

interface ScrollableCellProps extends htmlAttributes.div {
  readonly baseHeight?: string;
}

const DEFAULT_BASE_HEIGHT = "5rem";

export const ScrollableCell: ParentComponent<ScrollableCellProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["baseHeight"]);
  return (
    <PaddedCell class="overflow-auto">
      <div
        {...htmlAttributes.merge(divProps, {
          // Whatever this style means, it seems to work, i.e.:
          // - when there is little text, the row is allowed to shrink,
          // - when there is more text, the row grows to accommodate it,
          // - when there is a lot of text, the cell gets a scrollbar and the row doesn't grow,
          // - when the row is already higher because of other cells, the scrolling area grows to fit
          //   (possibly to the point when it no longer scrolls).
          class: "wrapTextAnywhere min-h-max",
          style: {"max-height": props.baseHeight || DEFAULT_BASE_HEIGHT},
        })}
      />
    </PaddedCell>
  );
};
