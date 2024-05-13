import {cx, debouncedAccessor} from "components/utils";
import {NullColumnFilter, UuidColumnFilter} from "data-access/memo-api/tquery/types";
import {createComputed} from "solid-js";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {FilterControl} from "./types";

const UUID_LENGTH = 36;

export const UuidFilterControl: FilterControl<NullColumnFilter | UuidColumnFilter> = (props) => {
  const filterFieldNames = useFilterFieldNames();
  const {
    value: [value, setValue],
  } = getFilterStateSignal({
    // eslint-disable-next-line solid/reactivity
    column: props.column.id,
    initial: {value: ""},
    filter: () => props.filter,
  });
  function buildFilter(value: string): NullColumnFilter | UuidColumnFilter | undefined {
    switch (value) {
      case "":
        return undefined;
      case "*":
        return {type: "column", column: props.schema.name, op: "null", inv: true};
      case "''":
        return {type: "column", column: props.schema.name, op: "null"};
      default:
        return {type: "column", column: props.schema.name, op: "=", val: value};
    }
  }
  const debouncedValue = debouncedAccessor(value, {
    outputImmediately: (v) => !v || v === "*" || v === "''" || v.length === UUID_LENGTH,
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
