import {TQuerySelect, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {cx} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {VoidComponent, createComputed, splitProps} from "solid-js";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {SelectFilterMode, SelectFilterModeControl} from "./select_filters_helper";
import {FilterControlProps} from "./types";

interface Props
  extends FilterControlProps,
    Pick<TQuerySelectProps, "querySpec" | "priorityQuerySpec" | "separatePriorityItems"> {}

export const UuidListSelectFilterControl: VoidComponent<Props> = (allProps) => {
  const [props, selectProps] = splitProps(allProps, ["column", "schema", "filter", "setFilter"]);
  const filterFieldNames = useFilterFieldNames();
  const schema = () => props.schema as DictDataColumnSchema;
  const {
    mode: [mode, setMode],
    value: [value, setValue],
  } = getFilterStateSignal({
    // eslint-disable-next-line solid/reactivity
    column: props.column.id,
    initial: {mode: "has_all" as SelectFilterMode, value: [] as readonly string[]},
    filter: () => props.filter,
  });
  function buildFilter(): FilterH | undefined {
    if (mode() === "has_all" && !value().length) {
      // Necessary to denote no filtering.
      return undefined;
    }
    return {
      type: "column",
      column: schema().name,
      op: mode(),
      val: value(),
    };
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
        showClearButton={false}
        small
      />
    </div>
  );
};
