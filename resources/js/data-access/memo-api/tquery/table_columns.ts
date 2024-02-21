import {PartialColumnConfig} from "components/ui/Table/TQueryTable";
import {NON_NULLABLE} from "components/utils";

export const CREATED_UPDATED_COLUMNS = {
  createdAt: {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false},
  createdBy: {name: "createdBy.name", initialVisible: false},
  updatedAt: {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
  updatedBy: {name: "updatedBy.name", initialVisible: false},
} satisfies Partial<Record<string, PartialColumnConfig>>;

export function getCreatedUpdatedColumns({includeUpdatedBy = true} = {}) {
  return [
    CREATED_UPDATED_COLUMNS.createdAt,
    CREATED_UPDATED_COLUMNS.createdBy,
    CREATED_UPDATED_COLUMNS.updatedAt,
    includeUpdatedBy ? CREATED_UPDATED_COLUMNS.updatedBy : undefined,
  ].filter(NON_NULLABLE) satisfies PartialColumnConfig[];
}
