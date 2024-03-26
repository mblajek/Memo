import {Select, SelectItem} from "components/ui/form/Select";
import {cx, useLangFunc} from "components/utils";
import {BoolColumnFilter, NullColumnFilter} from "data-access/memo-api/tquery/types";
import {createComputed, createMemo, createSignal} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {makeSelectItem} from "./select_items";
import {FilterControl} from "./types";

export const BoolFilterControl: FilterControl<NullColumnFilter | BoolColumnFilter> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const [value, setValue] = createSignal("-");
  createComputed(() => {
    if (!props.filter) {
      setValue("-");
    }
    // Ignore other external filter changes.
  });
  function buildFilter(): NullColumnFilter | BoolColumnFilter | undefined {
    switch (value()) {
      case "-":
        return undefined;
      case "t":
      case "f":
        return {type: "column", column: props.schema.name, op: "=", val: value() === "t"};
      case "*":
        return {type: "column", column: props.schema.name, op: "null", inv: true};
      case "null":
        return {type: "column", column: props.schema.name, op: "null"};
      default:
        throw new Error(`Invalid value: ${value()}`);
    }
  }
  const items = createMemo(() => {
    const items: SelectItem[] = [
      makeSelectItem({value: "-"}),
      {value: "t", label: () => t("bool_values.yes")},
      {value: "f", label: () => t("bool_values.no")},
    ];
    if (props.schema.nullable) {
      items.push(
        makeSelectItem({
          symbol: t("tables.filter.symbols.non_null_value"),
          description: t("tables.filter.non_null_value"),
        }),
        makeSelectItem({
          value: "null",
          symbol: t("tables.filter.symbols.null_value"),
          description: t("tables.filter.null_value"),
        }),
      );
    }
    return items;
  });
  return (
    <div class={cx(s.filter, s.filterLine)}>
      <div class="flex-grow flex flex-col items-stretch">
        <Select
          name={filterFieldNames.get(`val_${props.schema.name}`)}
          items={items()}
          value={value()}
          onValueChange={(value) => {
            setValue(value!);
            props.setFilter(buildFilter());
          }}
          nullable={false}
          small
        />
      </div>
    </div>
  );
};
