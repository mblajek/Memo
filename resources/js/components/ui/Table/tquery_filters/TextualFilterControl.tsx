import {InfoIcon} from "components/ui/InfoIcon";
import {Select, SelectItem} from "components/ui/form/Select";
import {debouncedFilterTextAccessor, useLangFunc} from "components/utils";
import {JSX, VoidComponent, createComputed, createSignal} from "solid-js";
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
  const t = useLangFunc();
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
  const items = () => {
    const items: SelectItem[] = [];
    function addItem(mode: Mode, desc: JSX.Element, infoHref?: string) {
      items.push({
        value: mode,
        text: `${mode} ${desc}`,
        label: () => <span class="font-semibold">{mode}</span>,
        labelOnList: () => (
          <div class="flex items-baseline gap-1">
            <span class="font-semibold w-4">{mode}</span>
            <span class="grow text-sm text-gray-500">{desc}</span>
            {infoHref && <InfoIcon href={infoHref} target="_blank" />}
          </div>
        ),
      });
    }
    addItem("~", t("tables.filter.textual.fuzzy"), "/pomoc/dopasowanie");
    if (props.columnType === "string") {
      addItem("=", t("tables.filter.textual.eq"));
    }
    addItem(".*", t("tables.filter.textual.regexp"), "https://support.google.com/a/answer/1371415?hl=pl");
    return items;
  };
  return (
    <div class={s.filterLine}>
      <Select
        class="w-10"
        name={`table_filter_op_${props.name}`}
        items={items()}
        value={mode()}
        onValueChange={(value) => setMode(value as Mode)}
        nullable={false}
        small
      />
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
