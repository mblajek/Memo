import {PaddedCell, ShowCellVal, cellFunc} from "components/ui/Table";
import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {exportCellFunc} from "components/ui/Table/table_export_cells";
import {UuidModelFilterControl} from "components/ui/Table/tquery_filters/UuidModelFilterControl";
import {NON_NULLABLE} from "components/utils";

export const CREATED_UPDATED_COLUMNS = {
  createdAt: {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false},
  createdBy: {name: "createdBy.name", initialVisible: false},
  updatedAt: {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
  updatedBy: {name: "updatedBy.name", initialVisible: false},
} satisfies Partial<Record<string, PartialColumnConfig>>;

export const GLOBAL_ADMIN_CREATED_UPDATED_COLUMNS = {
  createdAt: CREATED_UPDATED_COLUMNS.createdAt,
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
    filterControl: (props) => <UuidModelFilterControl {...props} model="user" />,
    metaParams: {textExportCell: exportCellFunc((v: string, ctx) => ctx.row["createdBy.name"] as string)},
    initialVisible: false,
  },
  updatedAt: CREATED_UPDATED_COLUMNS.updatedAt,
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
    filterControl: (props) => <UuidModelFilterControl {...props} model="user" />,
    metaParams: {textExportCell: exportCellFunc((v: string, ctx) => ctx.row["updatedBy.name"] as string)},
    initialVisible: false,
  },
} satisfies Partial<Record<string, PartialColumnConfig>>;

export function getCreatedUpdatedColumns({includeCreatedBy = true, includeUpdatedBy = true, globalAdmin = false} = {}) {
  const set = globalAdmin ? GLOBAL_ADMIN_CREATED_UPDATED_COLUMNS : CREATED_UPDATED_COLUMNS;
  return [
    set.createdAt,
    includeCreatedBy ? set.createdBy : undefined,
    set.updatedAt,
    includeUpdatedBy ? set.updatedBy : undefined,
  ].filter(NON_NULLABLE) satisfies PartialColumnConfig[];
}
