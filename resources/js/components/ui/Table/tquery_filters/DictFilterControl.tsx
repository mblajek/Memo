import {Select, SelectItem} from "components/ui/form/Select";
import {cx, useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {createComputed, createMemo, createSignal} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {SelectItemLabelOnList, makeSelectItem} from "./select_items";
import {FilterControl} from "./types";

export const DictFilterControl: FilterControl = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const dictionaries = useDictionaries();
  const schema = () => props.schema as DictDataColumnSchema;

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
      return {type: "column", column: schema().name, op: "null", inv: true};
    } else {
      const hasNull = value().includes("null");
      return {
        type: "op",
        op: "|",
        val: [
          hasNull ? {type: "column", column: schema().name, op: "null"} : "never",
          {type: "column", column: schema().name, op: "in", val: value().filter((v) => v !== "null")},
        ],
      };
    }
  }
  const items = createMemo(() => {
    const items: SelectItem[] = [];
    if (schema().nullable) {
      items.push(
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
      );
    }
    for (const position of dictionaries()?.get(schema().dictionaryId)?.activePositions || []) {
      items.push({
        value: position.id,
        text: position.label,
      });
    }
    return items;
  });
  return (
    <div class={cx(s.filter, "min-w-24")}>
      <Select
        name={filterFieldNames.get(`val_${schema().name}`)}
        items={items()}
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
        onFilterChange="internal"
        multiple
        small
      />
    </div>
  );
};
