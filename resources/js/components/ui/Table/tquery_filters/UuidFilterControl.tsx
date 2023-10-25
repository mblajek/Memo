import {cx} from "components/utils";
import {UuidColumnFilter} from "data-access/memo-api/tquery/types";
import {createMemo} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {FilterControl} from "./types";

export const UuidFilterControl: FilterControl<UuidColumnFilter> = (props) => {
  const defaultFilter = createMemo(
    () =>
      ({
        type: "column",
        column: props.name,
        op: "=",
        val: "",
      }) as const,
  );
  return (
    <div class={s.filterLine}>
      <div class={cx(s.wideEdit, "flex items-baseline")}>
        <span class="w-1.5 text-center">=</span>
        <input
          name={`table_filter_val_${props.name}`}
          type="text"
          class="h-full w-full border rounded"
          style={{"font-family": "monospace"}}
          value={props.filter?.val || ""}
          onInput={({target: {value}}) => props.setFilter(value ? {...defaultFilter(), val: value} : undefined)}
        />
      </div>
    </div>
  );
};
