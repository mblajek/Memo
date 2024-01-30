import {cx, debouncedAccessor} from "components/utils";
import {NullColumnFilter, UuidColumnFilter} from "data-access/memo-api/tquery/types";
import {createComputed, createSignal} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {useFilterFieldNames} from "./filter_field_names";
import {FilterControl} from "./types";

const UUID_LENGTH = 36;

export const UuidFilterControl: FilterControl<NullColumnFilter | UuidColumnFilter> = (props) => {
  const filterFieldNames = useFilterFieldNames();
  const [value, setValue] = createSignal("");
  createComputed(() => {
    if (!props.filter) {
      setValue("");
    }
    // Ignore other external filter changes.
  });
  function buildFilter(value: string): NullColumnFilter | UuidColumnFilter | undefined {
    switch (value) {
      case "":
        return undefined;
      case "*":
        return {type: "column", column: props.name, op: "null", inv: true};
      case "''":
        return {type: "column", column: props.name, op: "null"};
      default:
        return {type: "column", column: props.name, op: "=", val: value};
    }
  }
  // eslint-disable-next-line solid/reactivity
  const debouncedValue = debouncedAccessor(value, {
    outputImmediately: (v) => !v || v === "*" || v === "''" || v.length === UUID_LENGTH,
  });
  createComputed(() => props.setFilter(buildFilter(debouncedValue())));
  return (
    <div class={s.filterLine}>
      <div class={cx(s.wideEdit, "min-h-small-input flex items-baseline")}>
        <span class="w-1.5 text-center font-semibold">=</span>
        <input
          name={filterFieldNames.get(`val_${props.name}`)}
          type="text"
          autocomplete="off"
          class="h-full w-full border border-input-border rounded"
          style={{"font-family": "monospace"}}
          value={value()}
          onInput={({target: {value}}) => setValue(value)}
        />
      </div>
    </div>
  );
};
