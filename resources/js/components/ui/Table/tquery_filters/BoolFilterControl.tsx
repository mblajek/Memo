import {Select, SelectItem} from "components/ui/form/Select";
import {getFilterControlState} from "components/ui/Table/tquery_filters/filter_control_state";
import {cx} from "components/utils/classnames";
import {useLangFunc} from "components/utils/lang";
import {BoolColumnFilter, NullColumnFilter} from "data-access/memo-api/tquery/types";
import {createMemo} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {makeSelectItem} from "./select_items";
import {FilterControl, FilterHWithState} from "./types";

type Value = "-" | "t" | "f" | "*" | "null";
type Filter = FilterHWithState<{value: Value}, NullColumnFilter | BoolColumnFilter>;

export const BoolFilterControl: FilterControl<Filter> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const {
    state: {
      value: [value, setValue],
    },
    getState,
  } = getFilterControlState({
    initial: {value: "-" satisfies Value as Value},
    filter: () => props.filter,
  });
  function buildFilter(): Filter | undefined {
    switch (value()) {
      case "-":
        return undefined;
      case "t":
      case "f":
        return {type: "column", column: props.schema.name, op: "=", val: value() === "t", state: getState()};
      case "*":
        return {type: "column", column: props.schema.name, op: "null", inv: true, state: getState()};
      case "null":
        return {type: "column", column: props.schema.name, op: "null", state: getState()};
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
        makeSelectItem({value: "*", description: t("tables.filter.non_null_value")}),
        makeSelectItem({value: "null", description: t("tables.filter.null_value")}),
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
            setValue(value! as Value);
            props.setFilter(buildFilter());
          }}
          nullable={false}
          small
        />
      </div>
    </div>
  );
};
