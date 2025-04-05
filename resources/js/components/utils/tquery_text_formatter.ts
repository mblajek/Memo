import {ExportCellContext, ExportCellFunc, useTableTextExportCells} from "components/ui/Table/table_export_cells";
import {ColumnType} from "data-access/memo-api/tquery/types";

export function useTQueryTextFormatter() {
  const cc = useTableTextExportCells();
  const formatters: Partial<Record<ColumnType, ExportCellFunc<string | undefined, unknown>>> = {
    bool: cc.bool(),
    date: cc.date(),
    datetime: cc.datetime(),
    int: cc.int(),
    list: cc.list(),
    object: cc.object(),
    string: cc.string(),
    string_list: cc.stringList(),
    text: cc.text(),
    uuid: cc.uuid(),
    uuid_list: cc.uuidList(),
    dict: cc.dict(),
    dict_list: cc.dictList(),
  };
  const defFormatter = cc.default();
  return {
    format(type: ColumnType, value: unknown | null) {
      return (formatters[type] || defFormatter)({value} as ExportCellContext<unknown>);
    },
  };
}
