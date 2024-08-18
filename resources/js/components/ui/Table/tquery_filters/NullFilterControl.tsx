import {Select} from "components/ui/form/Select";
import {cx, useLangFunc} from "components/utils";
import {NullColumnFilter} from "data-access/memo-api/tquery/types";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {makeSelectItem} from "./select_items";
import {FilterControl} from "./types";

export const NullFilterControl: FilterControl<NullColumnFilter> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const {
    value: [value, setValue],
  } = getFilterStateSignal({
    // eslint-disable-next-line solid/reactivity
    column: props.column.id,
    initial: {value: "-"},
    filter: () => props.filter,
  });
  function buildFilter(): NullColumnFilter | undefined {
    switch (value()) {
      case "-":
        return undefined;
      case "*":
        return {type: "column", column: props.schema.name, op: "null", inv: true};
      case "null":
        return {type: "column", column: props.schema.name, op: "null"};
      default:
        throw new Error(`Invalid value: ${value()}`);
    }
  }
  const items = [
    makeSelectItem({value: "-"}),
    makeSelectItem({value: "*", description: t("tables.filter.non_null_value")}),
    makeSelectItem({value: "null", description: t("tables.filter.null_value")}),
  ];
  return (
    <div class={cx(s.filter, s.filterLine)}>
      <div class="flex-grow flex flex-col items-stretch">
        <Select
          name={filterFieldNames.get(`val_${props.schema.name}`)}
          items={items}
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
