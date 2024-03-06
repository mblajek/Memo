import {SearchInput} from "components/ui/SearchInput";
import {Select, SelectItem} from "components/ui/form/Select";
import {debouncedFilterTextAccessor, useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {VoidComponent, createComputed, createMemo, createSignal} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {useFilterFieldNames} from "./filter_field_names";
import {buildFuzzyTextualColumnFilter} from "./fuzzy_filter";
import {makeSelectItem} from "./select_items";
import {FilterControlProps} from "./types";

interface StringColumnProps extends FilterControlProps {
  readonly columnType: "string" | "text";
}

export const TextualFilterControl: VoidComponent<StringColumnProps> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const [mode, setMode] = createSignal("~");
  const [text, setText] = createSignal("");
  createComputed(() => {
    if (!props.filter) {
      setMode("~");
      setText("");
    }
    // Ignore other external filter changes.
  });
  function buildFilter(mode: string, value: string): FilterH | undefined {
    switch (mode) {
      case "~":
        return value ? buildFuzzyTextualColumnFilter(value, {column: props.name}) : undefined;
      case "=":
        return {type: "column", column: props.name, op: "=", val: value};
      case "*":
        return {type: "column", column: props.name, op: "null", inv: true};
      case "null":
        return {type: "column", column: props.name, op: "null"};
      case ".*":
        return {type: "column", column: props.name, op: "/v/", val: value};
      default:
        throw new Error(`Invalid value: ${value}`);
    }
  }
  // eslint-disable-next-line solid/reactivity
  const debouncedText = debouncedFilterTextAccessor(text);
  createComputed(() => props.setFilter(buildFilter(mode(), debouncedText())));
  const items = createMemo(() => {
    const items: SelectItem[] = [];
    items.push(
      makeSelectItem({
        symbol: "~",
        symbolClass: "w-4",
        description: t("tables.filter.textual.fuzzy"),
        infoIcon: {
          href: "/pomoc/dopasowanie",
        },
      }),
    );
    if (props.columnType === "string") {
      items.push(
        makeSelectItem({
          symbol: "=",
          symbolClass: "w-4",
          description: t("tables.filter.textual.eq"),
        }),
      );
    }
    if (props.nullable) {
      items.push(
        makeSelectItem({
          symbol: "*",
          symbolClass: "w-4",
          description: t("tables.filter.non_null_value"),
        }),
        makeSelectItem({
          value: "null",
          symbol: "‘’",
          symbolClass: "w-4",
          description: t("tables.filter.null_value"),
        }),
      );
    }
    items.push(
      makeSelectItem({
        symbol: ".*",
        symbolClass: "w-4",
        description: t("tables.filter.textual.regexp"),
        infoIcon: {
          href: "https://support.google.com/a/answer/1371415?hl=pl",
        },
      }),
    );
    return items;
  });
  const inputUsed = () => mode() === "~" || mode() === "=" || mode() === ".*";
  return (
    <div class={s.filterLine}>
      <div class="w-10">
        <Select
          name={filterFieldNames.get(`op_${props.name}`)}
          items={items()}
          value={mode()}
          onValueChange={(value) => setMode(value!)}
          nullable={false}
          small
        />
      </div>
      <div class={s.wideEdit}>
        <SearchInput
          name={filterFieldNames.get(`val_${props.name}`)}
          autocomplete="off"
          class="h-full w-full min-h-small-input"
          value={inputUsed() ? text() : ""}
          maxlength={inputUsed() ? undefined : 0}
          disabled={!inputUsed()}
          onInput={({target: {value}}) => setText(value)}
        />
      </div>
    </div>
  );
};
