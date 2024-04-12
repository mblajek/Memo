import {SearchInput} from "components/ui/SearchInput";
import {Select, SelectItem} from "components/ui/form/Select";
import {cx, debouncedFilterTextAccessor, useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {createComputed, createMemo, createSignal} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {buildFuzzyTextualColumnFilter} from "./fuzzy_filter";
import {makeSelectItem} from "./select_items";
import {FilterControl} from "./types";

export const TextualFilterControl: FilterControl = (props) => {
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
        return value ? buildFuzzyTextualColumnFilter(value, {column: props.schema.name}) : undefined;
      case "=":
        return {type: "column", column: props.schema.name, op: "=", val: value};
      case "*":
        return {type: "column", column: props.schema.name, op: "null", inv: true};
      case "null":
        return {type: "column", column: props.schema.name, op: "null"};
      case ".*":
        return {type: "column", column: props.schema.name, op: "/v/", val: value};
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
        value: "~",
        symbol: t("tables.filter.textual.symbols.fuzzy"),
        symbolClass: "w-4",
        description: t("tables.filter.textual.fuzzy"),
        infoIcon: {
          href: "/help/table-filtering#fuzzy",
        },
      }),
    );
    if (props.schema.type === "string") {
      items.push(
        makeSelectItem({
          value: "=",
          symbol: t("tables.filter.textual.symbols.eq"),
          symbolClass: "w-4",
          description: t("tables.filter.textual.eq"),
        }),
      );
    }
    if (props.schema.nullable) {
      items.push(
        makeSelectItem({
          value: "*",
          symbol: t("tables.filter.textual.symbols.non_null_value"),
          symbolClass: "w-4",
          description: t("tables.filter.non_null_value"),
        }),
        makeSelectItem({
          value: "null",
          symbol: t("tables.filter.textual.symbols.null_value"),
          symbolClass: "w-4",
          description: t("tables.filter.null_value"),
        }),
      );
    }
    items.push(
      makeSelectItem({
        value: ".*",
        symbol: t("tables.filter.textual.symbols.regexp"),
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
    <div class={cx(s.filter, s.filterLine)}>
      <div class="w-10">
        <Select
          name={filterFieldNames.get(`op_${props.schema.name}`)}
          items={items()}
          value={mode()}
          onValueChange={(value) => setMode(value!)}
          nullable={false}
          small
        />
      </div>
      <div class={s.wideEdit}>
        <SearchInput
          name={filterFieldNames.get(`val_${props.schema.name}`)}
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
