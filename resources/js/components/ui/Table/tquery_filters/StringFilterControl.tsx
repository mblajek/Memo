import {debouncedFilterTextAccessor} from "components/utils";
import {Filter} from "data-access/memo-api/tquery";
import {createComputed, createSignal, on} from "solid-js";
import {FilterControl, buildFuzzyStringColumnFilter} from ".";
import {tableStyle as ts} from "..";

type Mode = "~" | "=" | ".*";

export const StringFilterControl: FilterControl<Filter> = (props) => {
  const [mode, setMode] = createSignal<Mode>("~");
  const [text, setText] = createSignal("");
  createComputed(() => {
    if (!props.filter) {
      setMode("~");
      setText("");
    }
    // Ignore other external filter changes.
  });
  // eslint-disable-next-line solid/reactivity
  const debouncedText = debouncedFilterTextAccessor(text);
  createComputed(
    on([mode, debouncedText], ([mode, text]) => {
      if (mode === "~") {
        props.setFilter(buildFuzzyStringColumnFilter(text, props.name));
      } else if (mode === "=") {
        props.setFilter({type: "column", column: props.name, op: "=", val: text});
      } else if (mode === ".*") {
        props.setFilter({type: "column", column: props.name, op: "/v/", val: text});
      } else {
        return mode satisfies never;
      }
    }),
  );
  return (
    <div class={ts.filterLine}>
      <select
        name={`table_filter_op_${props.name}`}
        class="border rounded"
        value={mode()}
        onChange={({target: {value}}) => setMode(value as Mode)}
      >
        <option value="~">~</option>
        <option value="=">=</option>
        <option value=".*">.*</option>
      </select>
      <div class={ts.wideEdit}>
        <input
          name={`table_filter_val_${props.name}`}
          type="search"
          class="h-full w-full border rounded"
          value={text()}
          onInput={({target: {value}}) => setText(value)}
        />
      </div>
    </div>
  );
};
