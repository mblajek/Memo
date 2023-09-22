import {Component, JSX, Show} from "solid-js";
import {FilterControlProps} from ".";
import {FilterIcon, tableStyle as ts, useTable} from "..";
import {BoolFilterControl} from "./BoolFilterControl";
import {DateTimeFilterControl} from "./DateTimeFilterControl";
import {DecimalFilterControl} from "./DecimalFilterControl";
import {StringFilterControl} from "./StringFilterControl";
import {UuidFilterControl} from "./UuidFilterControl";

interface CommonFilteringParams {
  enabled?: boolean;
}

export interface DateTimeFilteringParams extends CommonFilteringParams {
  useDateOnlyInputs?: boolean;
}

export type FilteringParams = DateTimeFilteringParams;

export const ColumnFilterController: Component<FilterControlProps> = (props) => {
  const table = useTable();
  const filterControl = (): (() => JSX.Element) | undefined => {
    const meta = table.getColumn(props.name)?.columnDef.meta?.tquery;
    if (!meta || meta.filtering?.enabled === false) {
      return undefined;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, solid/reactivity
    const anyFilterProps: any = props;
    switch (meta.type) {
      case undefined:
        return undefined;
      case "uuid":
        return () => <UuidFilterControl {...anyFilterProps} />;
      case "string":
      case "text":
        return () => <StringFilterControl {...anyFilterProps} />;
      case "decimal0":
      case "decimal2":
        return () => <DecimalFilterControl {...anyFilterProps} columnType={meta.type} />;
      case "bool":
        return () => <BoolFilterControl {...anyFilterProps} />;
      case "date":
      case "datetime":
        return () => (
          <DateTimeFilterControl
            {...anyFilterProps}
            columnType={meta.type}
            useDateOnlyInputs={meta.filtering?.useDateOnlyInputs}
          />
        );
      default:
        return meta.type satisfies never;
    }
  };
  return (
    <div class={ts.columnFilterController}>
      <Show when={filterControl()}>
        {(filterControl) => (
          <>
            <div class={ts.filterMain}>{filterControl()()}</div>
            <FilterIcon class={ts.filterIcon} isFiltering={!!props.filter} onClear={() => props.setFilter(undefined)} />
          </>
        )}
      </Show>
    </div>
  );
};
