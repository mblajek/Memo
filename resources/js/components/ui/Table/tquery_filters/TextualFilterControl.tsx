import {debouncedFilterTextAccessor} from "components/utils";
import {Component, Show, createComputed, createSignal} from "solid-js";
import {FilterControlProps, buildFuzzyTextualColumnFilter} from ".";
import {tableStyle as ts} from "..";

interface StringColumnProps extends FilterControlProps {
  columnType: "string" | "text";
}

type Mode = "~" | "=" | ".*";

export const TextualFilterControl: Component<StringColumnProps> = (props) => {
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
  createComputed(() => {
    const m = mode();
    const t = debouncedText();
    if (m === "~") {
      props.setFilter(t ? buildFuzzyTextualColumnFilter(t, {column: props.name}) : undefined);
    } else if (m === "=") {
      props.setFilter({type: "column", column: props.name, op: "=", val: t});
    } else if (m === ".*") {
      props.setFilter({type: "column", column: props.name, op: "/v/", val: t});
    } else {
      return m satisfies never;
    }
  });
  return (
    <div class={ts.filterLine}>
      <select
        name={`table_filter_op_${props.name}`}
        class="border rounded"
        value={mode()}
        onChange={({target: {value}}) => setMode(value as Mode)}
      >
        <option value="~">~</option>
        <Show when={props.columnType === "string"}>
          <option value="=">=</option>
        </Show>
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
