import {NON_NULLABLE} from "components/utils";
import {Position, useDictionaries} from "data-access/memo-api/dictionaries";
import {VoidComponent, createMemo, mergeProps, splitProps} from "solid-js";
import {MultipleSelectPropsPart, Select, SelectBaseProps, SelectItem, SingleSelectPropsPart} from "./Select";
import {mergeSelectProps} from "./select_helper";

interface BaseProps extends Pick<SelectBaseProps, "name" | "label" | "disabled" | "placeholder" | "small"> {
  /** The id or name of the dictionary. */
  readonly dictionary: string;
  readonly filterable?: boolean;
  /** What to do with disabled dictionary positions. Default: hide. */
  readonly disabledItemsMode?: "show" | "showAsActive" | "hide";
  readonly positionsSorter?: (a: Position, b: Position) => number;
  /** A function creating the items. It can make use of the default item properties provided. */
  readonly itemFunc?: (pos: Position, defItem: () => DefaultDictionarySelectItem) => SelectItem | undefined;
}

export type DefaultDictionarySelectItem = Required<Pick<SelectItem, "value" | "text" | "disabled">>;

type Props = BaseProps & (SingleSelectPropsPart | MultipleSelectPropsPart);

const DEFAULT_PROPS = {
  filterable: true,
  disabledItemsMode: "hide",
  positionsSorter: () => 0,
  itemFunc: (pos: Position, defItem: () => DefaultDictionarySelectItem) => defItem(),
} satisfies Partial<BaseProps>;

export const DictionarySelect: VoidComponent<Props> = (allProps) => {
  const defProps = mergeProps(DEFAULT_PROPS, allProps);
  const [props, selectProps] = splitProps(defProps, [
    "dictionary",
    "filterable",
    "disabledItemsMode",
    "positionsSorter",
    "itemFunc",
  ]);
  const dictionaries = useDictionaries();
  const items = createMemo<SelectItem[] | undefined>(() => {
    const dicts = dictionaries();
    if (!dicts) {
      return undefined;
    }
    const dict = dicts.get(props.dictionary);
    const positions = props.disabledItemsMode === "hide" ? dict.activePositions : dict.allPositions;
    return positions
      .sort(props.positionsSorter)
      .map((pos) => {
        const defItem = (): DefaultDictionarySelectItem => ({
          value: pos.id,
          text: pos.label,
          disabled: props.disabledItemsMode === "show" && pos.disabled,
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
