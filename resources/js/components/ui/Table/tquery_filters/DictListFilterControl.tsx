import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {cx, useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {createComputed, createSignal} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {FilterControl} from "./types";

const MODES = ["has_all", "has_any", "has_only"] as const;
type Mode = (typeof MODES)[number];

export const DictListFilterControl: FilterControl = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const schema = () => props.schema as DictDataColumnSchema;
  const [mode, setMode] = createSignal<Mode>("has_all");
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
      <SegmentedControl
        name={filterFieldNames.get(`mode_${schema().name}`)}
        items={MODES.map((m) => ({
          value: m,
          label: () => (
            <span title={t(`tables.filter.set_operation.${m}.explanation`)}>
              {t(`tables.filter.set_operation.${m}.short`)}
            </span>
          ),
        }))}
        value={mode()}
        onValueChange={setMode}
        small
      />
      <DictionarySelect
        name={filterFieldNames.get(`val_${schema().name}`)}
        dictionary={schema().dictionaryId}
        value={value()}
        onValueChange={setValue}
        multiple
        small
      />
    </div>
  );
};
