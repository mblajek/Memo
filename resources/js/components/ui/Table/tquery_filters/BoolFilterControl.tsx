import {Select, SelectItem} from "components/ui/form/Select";
import {useLangFunc} from "components/utils";
import {BoolColumnFilter, NullColumnFilter} from "data-access/memo-api/tquery/types";
import {createComputed, createMemo, createSignal} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {makeSelectItem} from "./select_items";
import {FilterControl} from "./types";

export const BoolFilterControl: FilterControl<NullColumnFilter | BoolColumnFilter> = (props) => {
  const t = useLangFunc();
  const [value, setValue] = createSignal("-");
  createComputed(() => {
    if (!props.filter) {
      setValue("-");
    }
    // Ignore other external filter changes.
  });
  function buildFilter(value: string): NullColumnFilter | BoolColumnFilter | undefined {
    switch (value) {
      case "-":
        return undefined;
      case "t":
      case "f":
        return {type: "column", column: props.name, op: "=", val: value === "t"};
      case "*":
        return {type: "column", column: props.name, op: "null", inv: true};
      case "null":
        return {type: "column", column: props.name, op: "null"};
      default:
        throw new Error(`Invalid value: ${value}`);
    }
  }
  const items = createMemo(() => {
    const items: SelectItem[] = [
      makeSelectItem({value: "-"}),
      {value: "t", label: () => t("bool_values.yes")},
      {value: "f", label: () => t("bool_values.no")},
    ];
    if (props.nullable) {
      items.push(
        makeSelectItem({
          symbol: "*",
          description: t("tables.filter.non_null_value"),
        }),
        makeSelectItem({
          value: "null",
          symbol: "",
          description: t("tables.filter.null_value"),
        }),
      );
    }
    return items;
  });
  return (
    <div class={s.filterLine}>
      <Select
        name={`table_filter_val_${props.name}`}
        class="flex-grow"
        items={items()}
        value={value()}
        onValueChange={(value) => {
          setValue(value!);
          props.setFilter(buildFilter(value!));
        }}
        nullable={false}
        small
      />
    </div>
  );
};
