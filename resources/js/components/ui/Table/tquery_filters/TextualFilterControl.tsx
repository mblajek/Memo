import {debouncedFilterTextAccessor} from "components/utils";
import {Show, VoidComponent, createComputed, createSignal} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {buildFuzzyTextualColumnFilter} from "./fuzzy_filter";
import {FilterControlProps} from "./types";

interface StringColumnProps extends FilterControlProps {
  columnType: "string" | "text";
}

type Mode = "~" | "=" | ".*";

export const TextualFilterControl: VoidComponent<StringColumnProps> = (props) => {
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
    <div class={s.filterLine}>
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
      <div class={s.wideEdit}>
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
