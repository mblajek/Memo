import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {cx} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {createComputed} from "solid-js";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {SelectFilterMode, SelectFilterModeControl} from "./select_filters_helper";
import {FilterControl} from "./types";

export const DictListFilterControl: FilterControl = (props) => {
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
