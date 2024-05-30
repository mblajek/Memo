import {TQuerySelect, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {cx} from "components/utils";
import {VoidComponent, createMemo, splitProps} from "solid-js";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {useSingleSelectFilterHelper} from "./select_filters_helper";
import {FilterControlProps} from "./types";

interface Props
  extends FilterControlProps,
    Pick<TQuerySelectProps, "querySpec" | "priorityQuerySpec" | "separatePriorityItems"> {}

export const UuidSelectFilterControl: VoidComponent<Props> = (allProps) => {
  const [props, selectProps] = splitProps(allProps, ["column", "schema", "filter", "setFilter"]);
  const filterFieldNames = useFilterFieldNames();
  const {itemsForNullableColumn, buildFilter, updateValue} = useSingleSelectFilterHelper();
  const {
    value: [value, setValue],
  } = getFilterStateSignal({
    // eslint-disable-next-line solid/reactivity
    column: props.column.id,
    initial: {value: [] as readonly string[]},
    filter: () => props.filter,
  });
  const topItems = createMemo(() => (props.schema.nullable ? itemsForNullableColumn() : []));
  return (
    <div class={cx(s.filter, "min-w-24")}>
      <TQuerySelect
        name={filterFieldNames.get(`val_${props.schema.name}`)}
        {...selectProps}
        topItems={topItems()}
        value={value()}
        onValueChange={(newValue) => {
          setValue(updateValue(value(), newValue));
          props.setFilter(buildFilter(value(), props.schema.name));
        }}
        multiple
        showClearButton={false}
        small
      />
    </div>
  );
};
