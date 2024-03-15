import {TQuerySelect, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {cx, useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {VoidComponent, createComputed, createMemo, createSignal, splitProps} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {SelectItemLabelOnList, makeSelectItem} from "./select_items";
import {FilterControlProps} from "./types";

interface Props
  extends FilterControlProps,
    Pick<TQuerySelectProps, "querySpec" | "priorityQuerySpec" | "separatePriorityItems"> {}

export const UuidSelectFilterControl: VoidComponent<Props> = (allProps) => {
  const [props, selectProps] = splitProps(allProps, ["column", "schema", "filter", "setFilter"]);
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();

  const [value, setValue] = createSignal<readonly string[]>([]);
  createComputed(() => {
    if (!props.filter) {
      setValue([]);
    }
    // Ignore other external filter changes.
  });
  function buildFilter(): FilterH | undefined {
    if (!value().length) {
      return undefined;
    } else if (value().includes("*")) {
      return {type: "column", column: props.schema.name, op: "null", inv: true};
    } else {
      const hasNull = value().includes("null");
      return {
        type: "op",
        op: "|",
        val: [
          hasNull ? {type: "column", column: props.schema.name, op: "null"} : "never",
          {type: "column", column: props.schema.name, op: "in", val: value().filter((v) => v !== "null")},
        ],
      };
    }
  }
  const topItems = createMemo(() =>
    props.schema.nullable
      ? [
          makeSelectItem({
            symbol: t("tables.filter.symbols.non_null_value"),
            description: t("tables.filter.non_null_value"),
            label: () => (
              <SelectItemLabelOnList
                symbol={t("tables.filter.symbols.non_null_value")}
                description={t("tables.filter.non_null_value")}
              />
            ),
          }),
          {
            value: "__separator__",
            label: () => <hr />,
            disabled: true,
          },
          makeSelectItem({
            value: "null",
            symbol: t("tables.filter.symbols.null_value"),
            text: `'' ${t("tables.filter.null_value")}`,
            description: t("tables.filter.null_value"),
            label: () => (
              <SelectItemLabelOnList
                symbol={t("tables.filter.symbols.null_value")}
                description={t("tables.filter.null_value")}
              />
            ),
          }),
        ]
      : [],
  );
  return (
    <div class={cx(s.filter, "min-w-24")}>
      <TQuerySelect
        name={filterFieldNames.get(`val_${props.schema.name}`)}
        {...selectProps}
        topItems={topItems()}
        value={value()}
        onValueChange={(newValue) => {
          if (newValue.includes("*") && newValue.length > 1) {
            // The * (non-null) is exclusive with all the other options.
            if (value().includes("*")) {
              setValue(newValue.filter((v) => v !== "*"));
            } else {
              setValue(["*"]);
            }
          } else {
            setValue(newValue);
          }
          props.setFilter(buildFilter());
        }}
        multiple
        showClearButton={false}
        small
      />
    </div>
  );
};
