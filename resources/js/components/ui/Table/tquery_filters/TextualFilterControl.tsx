import {InfoIcon} from "components/ui/InfoIcon";
import {SearchInput} from "components/ui/SearchInput";
import {getFilterControlState} from "components/ui/Table/tquery_filters/filter_control_state";
import {DocsModalInfoIcon} from "components/ui/docs_modal";
import {closeAllSelects, Select, SelectItem} from "components/ui/form/Select";
import {cx} from "components/utils/classnames";
import {debouncedFilterTextAccessor} from "components/utils/debounce";
import {useLangFunc} from "components/utils/lang";
import {FilterH, filterHToObject} from "data-access/memo-api/tquery/filter_utils";
import {createComputed, createMemo, createSignal, VoidComponent} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {buildFuzzyTextualColumnFilter} from "./fuzzy_filter";
import {makeSelectItem} from "./select_items";
import {FilterControlProps, FilterHWithState} from "./types";

interface Props extends FilterControlProps<Filter> {
  readonly buildFilter?: (
    mode: Mode,
    value: string,
    defaultBuildFilter: (mode: Mode, value: string) => (FilterH & object) | undefined,
  ) => (FilterH & object) | undefined;
}

type Mode = "~" | "=" | "*" | "null" | ".*";

type Filter = FilterHWithState<{mode: Mode; text: string}>;

/** The filter control for column types `string`, `string_list` and `text`. */
export const TextualFilterControl: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const {
    state: {
      mode: [mode, setMode],
      text: [text, setText],
    },
    getState,
  } = getFilterControlState({
    initial: {mode: "~" satisfies Mode as Mode, text: ""},
    filter: () => props.filter,
  });
  const [inputText, setInputText] = createSignal(text());
  // eslint-disable-next-line solid/reactivity
  const debouncedInputText = debouncedFilterTextAccessor(inputText);
  createComputed(() => setText(debouncedInputText()));
  createComputed(() => setInputText(text()));
  function defaultBuildFilter(mode: Mode, value: string): (FilterH & object) | undefined {
    switch (mode) {
      case "~":
        return value ? filterHToObject(buildFuzzyTextualColumnFilter(value, {column: props.schema.name})) : undefined;
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
  function buildFilter(mode: Mode, value: string): Filter | undefined {
    const filter = props.buildFilter
      ? props.buildFilter(mode, value, defaultBuildFilter)
      : defaultBuildFilter(mode, value);
    return filter ? {...filter, state: getState()} : undefined;
  }
  createComputed(() => props.setFilter(buildFilter(mode(), text())));
  const items = createMemo(() => {
    const items: SelectItem[] = [];
    items.push(
      makeSelectItem({
        value: "~",
        symbol: t("tables.filter.textual.symbols.fuzzy"),
        symbolClass: "w-4",
        description: t("tables.filter.textual.fuzzy"),
        infoIcon: (
          <DocsModalInfoIcon
            href="/help/table-filtering-fuzzy.part"
            fullPageHref="/help/table-filtering#fuzzy"
            onClick={() => closeAllSelects()}
          />
        ),
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
        infoIcon: <InfoIcon href="https://support.google.com/a/answer/1371415?hl=pl" />,
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
          onValueChange={(value) => setMode(value! as Mode)}
          nullable={false}
          small
        />
      </div>
      <div class={s.wideEdit}>
        <SearchInput
          name={filterFieldNames.get(`val_${props.schema.name}`)}
          autocomplete="off"
          class="h-full w-full min-h-small-input"
          value={inputUsed() ? inputText() : ""}
          onValueChange={setInputText}
          maxlength={inputUsed() ? undefined : 0}
          disabled={!inputUsed()}
        />
      </div>
    </div>
  );
};
