import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {getFilterControlState} from "components/ui/Table/tquery_filters/filter_control_state";
import {cx} from "components/utils";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {createComputed} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {SelectFilterMode, SelectFilterModeControl} from "./select_filters_helper";
import {FilterControl, FilterHWithState} from "./types";

type Filter = FilterHWithState<{mode: SelectFilterMode; value: readonly string[]}>;

export const DictListFilterControl: FilterControl<Filter> = (props) => {
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
      <DictionarySelect
        name={filterFieldNames.get(`val_${schema().name}`)}
        dictionary={schema().dictionaryId}
        value={value()}
        onValueChange={setValue}
        multiple
        showClearButton={false}
        small
      />
    </div>
  );
};
