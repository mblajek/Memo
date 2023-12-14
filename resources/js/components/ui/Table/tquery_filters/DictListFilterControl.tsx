import {DictionarySelect} from "components/ui/form/DictionarySelect";
import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {VoidComponent, createComputed, createSignal} from "solid-js";
import {FilterControlProps} from "./types";

interface Props extends FilterControlProps {
  readonly dictionaryId: string;
}

const MODES = ["has_all", "has_any", "has_only"] as const;
type Mode = (typeof MODES)[number];

export const DictListFilterControl: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
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
      column: props.name,
      op: mode(),
      val: value(),
    };
  }
  createComputed(() => props.setFilter(buildFilter()));
  return (
    <div class="flex flex-col items-stretch gap-0.5" style={{"min-width": "160px"}}>
      <SegmentedControl
        name={`table_filter_mode_${props.name}`}
        items={MODES.map((m) => ({
          value: m,
          label: () => (
            <span title={t(`tables.filter.set_operation.${m}.explanation`)}>
              {t(`tables.filter.set_operation.${m}.short`)}
            </span>
          ),
        }))}
        value={mode()}
        setValue={setMode}
        small
      />
      <DictionarySelect
        name={`table_filter_val_${props.name}`}
        dictionary={props.dictionaryId}
        value={value()}
        onValueChange={setValue}
        multiple
        small
      />
    </div>
  );
};
