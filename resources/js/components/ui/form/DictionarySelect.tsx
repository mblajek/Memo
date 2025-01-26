import {NON_NULLABLE} from "components/utils/array_filter";
import {Position} from "data-access/memo-api/dictionaries";
import {useAttributes, useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {VoidComponent, createMemo, mergeProps, splitProps} from "solid-js";
import {MultipleSelectPropsPart, Select, SelectBaseProps, SelectItem, SingleSelectPropsPart} from "./Select";
import {mergeSelectProps} from "./select_helper";

interface BaseProps
  extends Pick<
    SelectBaseProps,
    "name" | "label" | "getGroupHeader" | "disabled" | "placeholder" | "small" | "autofocus"
  > {
  /** The id or name of the dictionary. */
  readonly dictionary: string;
  readonly filterable?: boolean;
  /** What to do with disabled dictionary positions. Default: hide. */
  readonly disabledItemsMode?: "show" | "showAsActive" | "hide";
  readonly positionsSorter?: (a: Position, b: Position) => number;
  /** A function creating the items. It can make use of the default item properties provided. */
  readonly itemFunc?: (pos: Position, defItem: () => DefaultDictionarySelectItem) => SelectItem | undefined;
  /** Whether to group the items. Default: true, unless positionsSorter is specified. */
  readonly useGrouping?: boolean;
}

export type DefaultDictionarySelectItem = Required<Pick<SelectItem, "value" | "text" | "disabled">> &
  Pick<SelectItem, "groupName">;

type Props = BaseProps & (SingleSelectPropsPart | MultipleSelectPropsPart);

const DEFAULT_PROPS = {
  filterable: true,
  disabledItemsMode: "hide",
  itemFunc: (pos, defItem) => defItem(),
} satisfies Partial<BaseProps>;

export const DictionarySelect: VoidComponent<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, selectProps] = splitProps(defProps, [
    "dictionary",
    "filterable",
    "disabledItemsMode",
    "positionsSorter",
    "itemFunc",
    "useGrouping",
  ]);
  const dictionaries = useDictionaries();
  const {getGroupName} = usePositionsGrouping();
  const items = createMemo<SelectItem[] | undefined>(() => {
    const dicts = dictionaries();
    if (!dicts) {
      return undefined;
    }
    const dict = dicts.get(props.dictionary);
    let positions = props.disabledItemsMode === "hide" ? dict.activePositions : dict.allPositions;
    if (props.positionsSorter) {
      positions = positions.toSorted(props.positionsSorter);
    }
    const useGrouping = props.useGrouping ?? !props.positionsSorter;
    return positions
      .map((pos) => {
        const defItem = (): DefaultDictionarySelectItem => ({
          value: pos.id,
          text: pos.label,
          disabled: props.disabledItemsMode === "show" && pos.disabled,
          groupName: useGrouping
            ? getGroupName({dictId: dict.id, pos, mode: selectProps.getGroupHeader ? "id" : "label"})
            : undefined,
        });
        return props.itemFunc(pos, defItem);
      })
      .filter(NON_NULLABLE);
  });
  const mergedSelectProps = mergeSelectProps<"items" | "isLoading" | "onFilterChange">(selectProps, {
    items: () => items() || [],
    isLoading: () => !items(),
    onFilterChange: () => (props.filterable ? "internal" : undefined),
  });
  return <Select {...mergedSelectProps} />;
};

export function usePositionsGrouping() {
  const {dictionaries, meetingTypeDict} = useFixedDictionaries();
  const attributes = useAttributes();
  const categoryAttribute = () => attributes()?.getByName<string>("position", "categoryDictId");
  function getMeetingTypeCategory(meetingType: string | Position) {
    return categoryAttribute()?.readFrom(
      (typeof meetingType === "string" ? meetingTypeDict()!.getPosition(meetingType) : meetingType).resource,
    );
  }
  return {
    /**
     * Returns the group name for a position-based item.
     * It normally uses the positionGroupDictId attribute, but for meeting types it uses the meeting category instead.
     */
    getGroupName({dictId, pos, mode = "label"}: {dictId: string; pos: Position; mode?: "id" | "label"}) {
      const groupId =
        dictId === meetingTypeDict()?.getDictionary().id
          ? getMeetingTypeCategory(pos)
          : pos.resource.positionGroupDictId || undefined;
      return groupId ? (mode === "id" ? groupId : dictionaries()?.getPositionById(groupId)?.label) : undefined;
    },
    getMeetingTypeCategory,
  };
}
