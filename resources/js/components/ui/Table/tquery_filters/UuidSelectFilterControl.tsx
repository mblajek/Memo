import {TQuerySelect, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {getFilterControlState} from "components/ui/Table/tquery_filters/filter_control_state";
import {cx} from "components/utils/classnames";
import {VoidComponent, createMemo, splitProps} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {useSingleSelectFilterHelper} from "./select_filters_helper";
import {FilterControlProps, FilterHWithState} from "./types";

interface Props
  extends FilterControlProps<Filter>,
    Pick<TQuerySelectProps, "querySpec" | "priorityQuerySpec" | "separatePriorityItems"> {}

type Filter = FilterHWithState<{value: readonly string[]}>;

export const UuidSelectFilterControl: VoidComponent<Props> = (allProps) => {
  const [props, selectProps] = splitProps(allProps, ["column", "schema", "filter", "setFilter"]);
  const filterFieldNames = useFilterFieldNames();
  const {itemsForNullableColumn, buildFilter, updateValue} = useSingleSelectFilterHelper();
  const {
    state: {
      value: [value, setValue],
    },
    getState,
  } = getFilterControlState({
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
          props.setFilter(buildFilter(value(), props.schema.name, getState()));
        }}
        multiple
        showClearButton={false}
        small
      />
    </div>
  );
};
