import {Select, SelectItem} from "components/ui/form/Select";
import {useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {VoidComponent, createComputed, createMemo, createSignal} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import {SelectItemLabelOnList, makeSelectItem} from "./select_items";
import {FilterControlProps} from "./types";

interface Props extends FilterControlProps {
  readonly dictionaryId: string;
}

export const DictFilterControl: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const dictionaries = useDictionaries();

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
      return {type: "column", column: props.name, op: "null", inv: true};
    } else {
      const hasNull = value().includes("null");
      return {
        type: "op",
        op: "|",
        val: [
          hasNull ? {type: "column", column: props.name, op: "null"} : "never",
          {type: "column", column: props.name, op: "in", val: value().filter((v) => v !== "null")},
        ],
      };
    }
  }
  const items = createMemo(() => {
    const items: SelectItem[] = [];
    if (props.nullable) {
      items.push(
        makeSelectItem({
          symbol: "*",
          description: t("tables.filter.non_null_value"),
          label: () => <SelectItemLabelOnList symbol="*" description={t("tables.filter.non_null_value")} />,
        }),
        {
          value: "__separator__",
          label: () => <hr />,
          disabled: true,
        },
        makeSelectItem({
          value: "null",
          symbol: "‘’",
          text: `'' ${t("tables.filter.null_value")}`,
          description: t("tables.filter.null_value"),
          label: () => <SelectItemLabelOnList symbol="‘’" description={t("tables.filter.null_value")} />,
        }),
      );
    }
    for (const position of dictionaries()?.get(props.dictionaryId)?.activePositions || []) {
      items.push({
        value: position.id,
        text: position.label,
      });
    }
    return items;
  });
  return (
    <div style={{"min-width": "160px"}}>
      <Select
        name={filterFieldNames.get(`val_${props.name}`)}
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
