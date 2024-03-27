import {TQuerySelect, TQuerySelectProps} from "components/ui/form/TQuerySelect";
import {cx} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {DictDataColumnSchema, SetsOp} from "data-access/memo-api/tquery/types";
import {VoidComponent, createComputed, createSignal, splitProps} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {useMultiSelectFilterHelper} from "./select_filters_helper";
import {FilterControlProps} from "./types";

interface Props
  extends FilterControlProps,
    Pick<TQuerySelectProps, "querySpec" | "priorityQuerySpec" | "separatePriorityItems"> {}

export const UuidListSelectFilterControl: VoidComponent<Props> = (allProps) => {
  const [props, selectProps] = splitProps(allProps, ["column", "schema", "filter", "setFilter"]);
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
