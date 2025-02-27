import {TQuerySelect, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {getFilterControlState} from "components/ui/Table/tquery_filters/filter_control_state";
import {cx} from "components/utils/classnames";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {VoidComponent, createComputed, splitProps} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {SelectFilterMode, SelectFilterModeControl} from "./select_filters_helper";
import {FilterControlProps, FilterHWithState} from "./types";

interface Props
  extends FilterControlProps<Filter>,
    Pick<TQuerySelectProps, "querySpec" | "priorityQuerySpec" | "separatePriorityItems"> {}

type Filter = FilterHWithState<{mode: SelectFilterMode; value: readonly string[]}>;

export const UuidListSelectFilterControl: VoidComponent<Props> = (allProps) => {
  const [props, selectProps] = splitProps(allProps, ["column", "schema", "filter", "setFilter"]);
  const filterFieldNames = useFilterFieldNames();
  const schema = () => props.schema as DictDataColumnSchema;
  const {
    state: {
      mode: [mode, setMode],
      value: [value, setValue],
    },
    getState,
  } = getFilterControlState({
    initial: {mode: "has_all" satisfies SelectFilterMode as SelectFilterMode, value: [] satisfies readonly string[]},
    filter: () => props.filter,
  });
  function buildFilter(): Filter | undefined {
    if (mode() === "has_all" && !value().length) {
      // Necessary to denote no filtering.
      return undefined;
    }
    return {type: "column", column: schema().name, op: mode(), val: value(), state: getState()};
  }
  createComputed(() => props.setFilter(buildFilter()));
  return (
    <div class={cx(s.filter, "min-w-24 flex flex-col items-stretch gap-0.5")}>
      <SelectFilterModeControl columnName={schema().name} mode={mode()} onModeChange={setMode} />
      <TQuerySelect
        name={filterFieldNames.get(`val_${schema().name}`)}
        {...selectProps}
        value={value()}
        onValueChange={setValue}
        multiple
        headerItemSelectsAll
        showClearButton={false}
        small
      />
    </div>
  );
};
