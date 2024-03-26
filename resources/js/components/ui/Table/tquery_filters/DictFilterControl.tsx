import {Select} from "components/ui/form/Select";
import {cx} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {createComputed, createMemo, createSignal} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {useSingleSelectFilterHelper} from "./select_filters_helper";
import {FilterControl} from "./types";

export const DictFilterControl: FilterControl = (props) => {
  const filterFieldNames = useFilterFieldNames();
  const dictionaries = useDictionaries();
  const {itemsForNullableColumn, buildFilter, updateValue} = useSingleSelectFilterHelper();
  const schema = () => props.schema as DictDataColumnSchema;

  const [value, setValue] = createSignal<readonly string[]>([]);
  createComputed(() => {
    if (!props.filter) {
      setValue([]);
    }
    // Ignore other external filter changes.
  });
  const items = createMemo(() => [
    ...(schema().nullable ? itemsForNullableColumn() : []),
    ...(dictionaries()?.get(schema().dictionaryId)?.activePositions || []).map((position) => ({
      value: position.id,
      text: position.label,
    })),
  ]);
  return (
    <div class={cx(s.filter, "min-w-24")}>
      <Select
        name={filterFieldNames.get(`val_${schema().name}`)}
        items={items()}
        value={value()}
        onValueChange={(newValue) => {
          setValue(updateValue(value(), newValue));
          props.setFilter(buildFilter(value(), schema().name));
        }}
        onFilterChange="internal"
        multiple
        showClearButton={false}
        small
      />
    </div>
  );
};
