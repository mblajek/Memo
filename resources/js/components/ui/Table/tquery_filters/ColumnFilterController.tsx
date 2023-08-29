import {Component, Show, createMemo} from "solid-js";
import {Dynamic} from "solid-js/web";
import {FilterControlProps} from ".";
import {FilterIcon, tableStyle as ts, useTable} from "..";
import {TQueryColumnMeta} from "../TQueryTable";
import {BoolFilterControl} from "./BoolFilterControl";
import {DateFilterControl} from "./DateFilterControl";
import {DateTimeFilterControl} from "./DateTimeFilterControl";
import {Decimal0FilterControl} from "./Decimal0FilterControl";
import {Decimal2FilterControl} from "./Decimal2FilterControl";
import {StringFilterControl} from "./StringFilterControl";
import {DateFilterForDateTimeColumnControl} from "./DateFilterForDateTimeColumnControl";

interface CommonFilteringParams {
  enabled?: boolean;
}

export interface DateTimeFilteringParams extends CommonFilteringParams {
  useDateOnlyInputs?: boolean;
}

export type FilteringParams = DateTimeFilteringParams;

function getFilterControl(meta: TQueryColumnMeta) {
  if (meta.filtering?.enabled === false) {
    return undefined;
  }
  switch (meta.type) {
    case undefined:
      return undefined;
    case "string":
      return StringFilterControl;
    case "text":
      return StringFilterControl;
    case "decimal0":
      return Decimal0FilterControl;
    case "decimal2":
      return Decimal2FilterControl;
    case "bool":
      return BoolFilterControl;
    case "date":
      return DateFilterControl;
    case "datetime":
      return (meta.filtering as DateTimeFilteringParams | undefined)?.useDateOnlyInputs
        ? DateFilterForDateTimeColumnControl
        : DateTimeFilterControl;
    default:
      return meta.type satisfies never;
  }
}

export const ColumnFilterController: Component<FilterControlProps> = (props) => {
  const table = useTable();
  const filterComponent = createMemo(() => {
    const meta = table.getColumn(props.name)?.columnDef.meta?.tquery;
    return meta && getFilterControl(meta);
  });
  return (
    <div class={ts.columnFilterController}>
      <Show when={filterComponent()}>
        {(filterComponent) => (
          <>
            <div class={ts.filterMain}>
              <Dynamic component={filterComponent()} {...props} />
            </div>
            <FilterIcon class={ts.filterIcon} isFiltering={!!props.filter} onClear={() => props.setFilter(undefined)} />
          </>
        )}
      </Show>
    </div>
  );
};
