import {cx} from "components/utils";
import {UuidColumnFilter} from "data-access/memo-api/tquery";
import {createMemo} from "solid-js";
import {FilterControl} from ".";
import {tableStyle as ts} from "..";

export const UuidFilterControl: FilterControl<UuidColumnFilter> = (props) => {
  const defFilter = createMemo<UuidColumnFilter>(() => ({
    type: "column",
    column: props.name,
    op: "=",
    val: "",
  }));
  return (
    <div class={ts.filterLine}>
      <div class={cx(ts.wideEdit, "flex items-baseline")}>
        <span class="w-1.5 text-center">=</span>
        <input
          name={`table_filter_val_${props.name}`}
          type="text"
          class="h-full w-full border rounded"
          style={{"font-family": "monospace"}}
          value={props.filter?.val || ""}
          onInput={({target: {value}}) => props.setFilter(value ? {...defFilter(), val: value} : undefined)}
        />
      </div>
    </div>
  );
};
