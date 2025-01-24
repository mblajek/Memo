import {getFilterControlState} from "components/ui/Table/tquery_filters/filter_control_state";
import {cx} from "components/utils/classnames";
import {delayedAccessor} from "components/utils/debounce";
import {NullColumnFilter, UuidColumnFilter} from "data-access/memo-api/tquery/types";
import {Api} from "data-access/memo-api/types";
import {createComputed} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {FilterControl, FilterHWithState} from "./types";

type Filter = FilterHWithState<{value: string}, NullColumnFilter | UuidColumnFilter>;

export const UuidFilterControl: FilterControl<Filter> = (props) => {
  const filterFieldNames = useFilterFieldNames();
  const {
    state: {
      value: [value, setValue],
    },
    getState,
  } = getFilterControlState({
    initial: {value: ""},
    filter: () => props.filter,
  });
  function buildFilter(value: string): Filter | undefined {
    switch (value) {
      case "":
        return undefined;
      case "*":
        return {type: "column", column: props.schema.name, op: "null", inv: true, state: getState()};
      case "''":
        return {type: "column", column: props.schema.name, op: "null", state: getState()};
      default:
        return {type: "column", column: props.schema.name, op: "=", val: value, state: getState()};
    }
  }
  const debouncedValue = delayedAccessor(value, {
    outputImmediately: (v) => !v || v === "*" || v === "''" || v.length === Api.ID_LENGTH,
  });
  createComputed(() => props.setFilter(buildFilter(debouncedValue())));
  return (
    <div class={cx(s.filter, s.filterLine)}>
      <div class={cx(s.wideEdit, "min-h-small-input flex items-baseline")}>
        <span class="w-1.5 text-center font-semibold">=</span>
        <input
          name={filterFieldNames.get(`val_${props.schema.name}`)}
          type="text"
          autocomplete="off"
          class="h-full w-full border border-input-border rounded font-mono"
          value={value()}
          onInput={({target: {value}}) => setValue(value)}
        />
      </div>
    </div>
  );
};
