import {ColumnType} from "data-access/memo-api/tquery";
import {Component, Show, createMemo} from "solid-js";
import {Dynamic} from "solid-js/web";
import {FilterControl, FilterControlProps} from ".";
import {FilterIcon, tableStyle as ts, useTable} from "..";
import {BoolFilterControl} from "./BoolFilterControl";
import {DateFilterControl} from "./DateFilterControl";
import {DateTimeFilterControl} from "./DateTimeFilterControl";
import {StringFilterControl} from "./StringFilterControl";

const CONTROLS_BY_TYPE = new Map<ColumnType, FilterControl<any>>()
  .set("bool", BoolFilterControl)
  .set("string", StringFilterControl)
  .set("text", StringFilterControl)
  .set("date", DateFilterControl)
  .set("datetime", DateTimeFilterControl);

export const ColumnFilterController: Component<FilterControlProps> = props => {
  const table = useTable();
  const filterComponent = createMemo(() => {
    const meta = table.getColumn(props.name)?.columnDef.meta?.tquery;
    return meta && CONTROLS_BY_TYPE.get(meta.type);
  });
  return <div class={ts.columnFilterController}>
    <Show when={filterComponent()}>
      <div class={ts.filterMain}>
        <Dynamic component={filterComponent()!} {...props} />
      </div>
      <FilterIcon
        class={ts.filterIcon}
        isFiltering={!!props.filter}
        onClear={() => props.setFilter(undefined)}
      />
    </Show>
  </div>;
};
