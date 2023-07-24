import {debouncedFilterTextAccessor} from "components/utils";
import {StringColumnFilter, StringFilterOp} from "data-access/memo-api/tquery";
import {createComputed, createMemo, createSignal, on} from "solid-js";
import {FilterControl} from ".";
import {tableStyle as ts} from "..";

export const StringFilterControl: FilterControl<StringColumnFilter> = props => {
  const defFilter = createMemo<StringColumnFilter>(() => ({
    type: "column",
    column: props.name,
    op: "%v%",
    val: "",
  }));
  function setOrDisableFilter(f: StringColumnFilter) {
    props.setFilter(
      f.op === defFilter().op && f.val === defFilter().val ? undefined : f);
  }
  const [val, setVal] = createSignal("");
  // eslint-disable-next-line solid/reactivity
  const debouncedVal = debouncedFilterTextAccessor(val);
  createComputed(() => setVal((props.filter || defFilter()).val));
  // React only to val changes here, not to filter changes.
  createComputed(on(debouncedVal, val => setOrDisableFilter({
    ...props.filter || defFilter(),
    val,
  })));
  return <div class={ts.filterLine}>
    <select
      name={`table_filter_op_${props.name}`}
      class="border rounded"
      value={(props.filter || defFilter()).op}
      onChange={({target: {value}}) => setOrDisableFilter({
        ...props.filter || defFilter(),
        op: value as StringFilterOp,
      })}
    >
      <option value="%v%">~</option>
      <option value="=">=</option>
      <option value="/v/">.*</option>
    </select>
    <div class={ts.wideEdit}>
      <input
        name={`table_filter_val_${props.name}`}
        type="search"
        class="h-full w-full border rounded"
        value={val()}
        onInput={e => setVal(e.target.value)}
      />
    </div>
  </div>;
};
