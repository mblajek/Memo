import {PaddedCell, ShowCellVal, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {exportCellFunc} from "components/ui/Table/table_export_cells";
import {UuidSelectFilterControl} from "components/ui/Table/tquery_filters/UuidSelectFilterControl";
import {NON_NULLABLE, htmlAttributes} from "components/utils";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {objectRecursiveMerge} from "components/utils/object_util";
import {ParentComponent, Show} from "solid-js";

export class TableColumnsSet<C extends string, D extends Readonly<Record<C, PartialColumnConfig>>> {
  constructor(readonly columns: D) {}

  get(...cols: (C | PartialColumnConfig | [C, Partial<PartialColumnConfig>])[]): PartialColumnConfig[] {
    return cols.map((c) =>
      typeof c === "string"
        ? this.columns[c]
        : Array.isArray(c)
          ? objectRecursiveMerge<(typeof this.columns)[C]>(this.columns[c[0]], c[1] as Partial<D[C]>)
          : c,
    );
  }
}

export function useTableColumns() {
  const modelQuerySpecs = useModelQuerySpecs();
  const columnsSet = new TableColumnsSet({
    createdAt: {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false, globalFilterable: false},
    createdBy: {name: "createdBy.name", initialVisible: false, globalFilterable: false},
    updatedAt: {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false, globalFilterable: false},
    updatedBy: {name: "updatedBy.name", initialVisible: false, globalFilterable: false},
  });
  const globalAdminColumnsSet = new TableColumnsSet({
    ...columnsSet.columns,
    createdBy: {
      name: "createdBy.id",
      extraDataColumns: ["createdBy.name"],
      columnDef: {
        cell: cellFunc<string>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.row["createdBy.name"]}>{(v) => <>{v()}</>}</ShowCellVal>
          </PaddedCell>
        )),
        size: undefined,
      },
      filterControl: (props) => (
        <Show when={modelQuerySpecs.user()}>
          {(querySpecs) => <UuidSelectFilterControl {...props} {...querySpecs()} />}
        </Show>
      ),
      metaParams: {textExportCell: exportCellFunc((v: string, ctx) => ctx.row["createdBy.name"] as string)},
      initialVisible: false,
      globalFilterable: false,
    },
    updatedBy: {
      name: "updatedBy.id",
      extraDataColumns: ["updatedBy.name"],
      columnDef: {
        cell: cellFunc<string>((props) => (
          <PaddedCell>
            <ShowCellVal v={props.row["updatedBy.name"]}>{(v) => <>{v()}</>}</ShowCellVal>
          </PaddedCell>
        )),
        size: undefined,
      },
      filterControl: (props) => (
        <Show when={modelQuerySpecs.user()}>
          {(querySpecs) => <UuidSelectFilterControl {...props} {...querySpecs()} />}
        </Show>
      ),
      metaParams: {textExportCell: exportCellFunc((v: string, ctx) => ctx.row["updatedBy.name"] as string)},
      initialVisible: false,
      globalFilterable: false,
    },
  });

  function getCreatedUpdatedColumns({includeCreatedBy = true, includeUpdatedBy = true, globalAdmin = false} = {}) {
    const set = globalAdmin ? globalAdminColumnsSet : columnsSet;
    return set.get(
      ...[
        "createdAt",
        includeCreatedBy ? "createdBy" : undefined,
        "updatedAt",
        includeUpdatedBy ? "updatedBy" : undefined,
      ].filter(NON_NULLABLE),
    );
  }

  return {
    columnsSet,
    globalAdminColumnsSet,
    getCreatedUpdatedColumns,
  };
}

export const ScrollableCell: ParentComponent<htmlAttributes.div> = (props) => (
  <PaddedCell class="overflow-auto">
    <div
      {...htmlAttributes.merge(props, {
        // Whatever this style means, it seems to work, i.e.:
        // - when there is little text, the row is allowed to shrink,
        // - when there is more text, the row grows to accommodate it,
        // - when there is a lot of text, the cell gets a scrollbar and the row doesn't grow,
        // - when the row is already higher because of other cells, the scrolling area grows to fit
        //   (possibly to the point when it no longer scrolls).
        class: "wrapTextAnywhere max-h-20 min-h-max",
      })}
    >
      {props.children}
    </div>
  </PaddedCell>
);
