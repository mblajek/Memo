import {JSX, Show, VoidComponent} from "solid-js";
import {FilterIcon, useTable} from "..";
import {BoolFilterControl} from "./BoolFilterControl";
import s from "./ColumnFilterController.module.scss";
import {DateTimeFilterControl} from "./DateTimeFilterControl";
import {IntFilterControl} from "./IntFilterControl";
import {TextualFilterControl} from "./TextualFilterControl";
import {UuidFilterControl} from "./UuidFilterControl";
import {FilterControlProps} from "./types";

interface CommonFilteringParams {
  enabled?: boolean;
}

export interface DateTimeFilteringParams extends CommonFilteringParams {
  useDateTimeInputs?: boolean;
}

export type FilteringParams = DateTimeFilteringParams;

/**
 * The filter controler element for the named column.
 *
 * TODO: Add support for nullable columns.
 */
export const ColumnFilterController: VoidComponent<FilterControlProps> = (props) => {
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
      case "bool":
        return () => <BoolFilterControl {...anyFilterProps} />;
      case "date":
      case "datetime":
        return () => (
          <DateTimeFilterControl
            {...anyFilterProps}
            columnType={meta.type}
            useDateTimeInputs={meta.filtering?.useDateTimeInputs}
          />
        );
      case "int":
        return () => <IntFilterControl {...anyFilterProps} />;
      case "string":
      case "text":
        return () => <TextualFilterControl {...anyFilterProps} columnType={meta.type} />;
      case "uuid":
        return () => <UuidFilterControl {...anyFilterProps} />;
      default:
        return meta.type satisfies never;
    }
  };
  return (
    <div class={s.columnFilterController}>
      <Show when={filterControl()}>
        {(filterControl) => (
          <>
            <div class={s.filterMain}>{filterControl()()}</div>
            <FilterIcon class={s.filterIcon} isFiltering={!!props.filter} onClear={() => props.setFilter(undefined)} />
          </>
        )}
      </Show>
    </div>
  );
};
