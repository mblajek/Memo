import {ColumnFilter, ColumnType, FilterTypeByColumnType} from "data-access/memo-api/tquery";
import {Component, createMemo} from "solid-js";
import {Dynamic} from "solid-js/web";
import {FilterControl, UnnamedColumnFilter} from ".";
import {useTable} from "../Table";
import {BoolFilterControl} from "./BoolFilterControl";

interface Props {
  name: string;
  filter: ColumnFilter | undefined;
  setFilter: (filter: ColumnFilter | undefined) => void;
}

class ControlsByType {
  private readonly map = new Map<ColumnType, FilterControl<any>>();
  set<C extends ColumnType>(
    columnType: C, control: FilterControl<FilterTypeByColumnType[C]>) {
    this.map.set(columnType, control);
    return this;
  }
  get<C extends ColumnType>(columnType: C): FilterControl<FilterTypeByColumnType[C]> | undefined {
    return this.map.get(columnType);
  }
}

const CONTROLS_BY_TYPE = new ControlsByType()
  .set("bool", BoolFilterControl);

export const ColumnFilterControl: Component<Props> = props => {
  const table = useTable();
  const filterComponent = createMemo(() => {
    const meta = table.getColumn(props.name)?.columnDef.meta?.tquery;
    return meta && CONTROLS_BY_TYPE.get(meta?.type);
  });
  return <Dynamic component={filterComponent()!}
    filter={props.filter}
    setFilter={(f: UnnamedColumnFilter<ColumnFilter> | undefined) =>
      props.setFilter(f && {...f, column: props.name} as ColumnFilter)}
  />;
};
