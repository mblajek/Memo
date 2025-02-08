import {usePositionsGrouping} from "components/ui/form/DictionarySelect";
import {Select, SelectItem} from "components/ui/form/Select";
import {getFilterControlState} from "components/ui/Table/tquery_filters/filter_control_state";
import {cx} from "components/utils/classnames";
import {Dictionary, Position} from "data-access/memo-api/dictionaries";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {DictDataColumnSchema} from "data-access/memo-api/tquery/types";
import {createMemo, VoidComponent} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {useSingleSelectFilterHelper} from "./select_filters_helper";
import {FilterControlProps, FilterHWithState} from "./types";

interface DictFilterControlProps extends FilterControlProps<Filter> {
  readonly positionItemsFunc?: (
    dictionary: Dictionary,
    defItem: (pos: Position) => SelectItem,
  ) => readonly SelectItem[];
}

type Filter = FilterHWithState<{value: readonly string[]}>;

export const DictFilterControl: VoidComponent<DictFilterControlProps> = (props) => {
  const filterFieldNames = useFilterFieldNames();
  const dictionaries = useDictionaries();
  const {getGroupName} = usePositionsGrouping();
  const {itemsForNullableColumn, buildFilter, updateValue} = useSingleSelectFilterHelper();
  const schema = () => props.schema as DictDataColumnSchema;
  const {
    state: {
      value: [value, setValue],
    },
    getState,
  } = getFilterControlState({
    initial: {value: [] satisfies readonly string[]},
    filter: () => props.filter,
  });
  const positionItemsFunc = () => props.positionItemsFunc || ((dict, defItem) => dict.activePositions.map(defItem));
  const items = createMemo(() => {
    const dict = dictionaries()?.get(schema().dictionaryId);
    if (!dict) {
      return [];
    }
    return [
      ...(schema().nullable ? itemsForNullableColumn() : []),
      ...positionItemsFunc()(dict, (pos) => ({
        value: pos.id,
        text: pos.label,
        groupName: getGroupName({dictId: dict.id, pos}),
      })),
    ];
  });
  return (
    <div class={cx(s.filter, "min-w-24")}>
      <Select
        name={filterFieldNames.get(`val_${schema().name}`)}
        items={items()}
        value={value()}
        onValueChange={(newValue) => {
          setValue(updateValue(value(), newValue));
          props.setFilter(buildFilter(value(), schema().name, getState()));
        }}
        onFilterChange="internal"
        multiple
        headerItemSelectsAll
        showClearButton={false}
        small
      />
    </div>
  );
};
