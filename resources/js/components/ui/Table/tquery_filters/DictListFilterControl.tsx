import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {cx} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {DictDataColumnSchema, SetsOp} from "data-access/memo-api/tquery/types";
import {createComputed, createSignal} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {useMultiSelectFilterHelper} from "./select_filters_helper";
import {FilterControl} from "./types";

export const DictListFilterControl: FilterControl = (props) => {
  const filterFieldNames = useFilterFieldNames();
  const {ModeControl} = useMultiSelectFilterHelper();
  const schema = () => props.schema as DictDataColumnSchema;
  const [mode, setMode] = createSignal<SetsOp>("has_all");
  const [value, setValue] = createSignal<readonly string[]>([]);
  createComputed(() => {
    if (!props.filter) {
      setMode("has_all");
      setValue([]);
    }
    // Ignore other external filter changes.
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
      <ModeControl columnName={schema().name} mode={mode()} onModeChange={setMode} />
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
