import {SegmentedControl} from "components/ui/form/SegmentedControl";
import {useLangFunc} from "components/utils";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {SetsOp} from "data-access/memo-api/tquery/types";
import {VoidComponent} from "solid-js";
import {useFilterFieldNames} from "./filter_field_names";
import {SelectItemLabelOnList, makeSelectItem} from "./select_items";

export function useSingleSelectFilterHelper() {
  const t = useLangFunc();

  const NULL_VALUE = "null";
  const NON_NULL_VALUE = "*";

  function itemsForNullableColumn() {
    return [
      makeSelectItem({
        value: NON_NULL_VALUE,
        symbol: t("tables.filter.symbols.non_null_value"),
        description: t("tables.filter.non_null_value"),
        label: () => (
          <SelectItemLabelOnList
            value={NON_NULL_VALUE}
            symbol={t("tables.filter.symbols.non_null_value")}
            description={t("tables.filter.non_null_value")}
          />
        ),
      }),
      {
        value: "__separator__",
        label: () => <hr />,
        disabled: true,
      },
      makeSelectItem({
        value: NULL_VALUE,
        symbol: t("tables.filter.symbols.null_value"),
        text: `'' ${t("tables.filter.null_value")}`,
        description: t("tables.filter.null_value"),
        label: () => (
          <SelectItemLabelOnList
            value={NULL_VALUE}
            symbol={t("tables.filter.symbols.null_value")}
            description={t("tables.filter.null_value")}
          />
        ),
      }),
    ];
  }

  function buildFilter(value: readonly string[], column: string): FilterH | undefined {
    if (!value.length) {
      return undefined;
    } else if (value.includes(NON_NULL_VALUE)) {
      return {type: "column", column, op: "null", inv: true};
    } else {
      const hasNull = value.includes(NULL_VALUE);
      return {
        type: "op",
        op: "|",
        val: [
          hasNull ? {type: "column", column, op: "null"} : "never",
          {type: "column", column, op: "in", val: value.filter((v) => v !== NULL_VALUE)},
        ],
      };
    }
  }

  function updateValue(oldValue: readonly string[], newValue: readonly string[]): readonly string[] {
    if (newValue.includes(NON_NULL_VALUE) && newValue.length > 1) {
      // The NON_NULL_VALUE is exclusive with all the other options.
      return oldValue.includes(NON_NULL_VALUE) ? newValue.filter((v) => v !== NON_NULL_VALUE) : [NON_NULL_VALUE];
    } else {
      return newValue;
    }
  }

  return {
    NULL_VALUE,
    NON_NULL_VALUE,
    itemsForNullableColumn,
    buildFilter,
    updateValue,
  };
}

export type SelectFilterMode = SetsOp | "=";
export const SELECT_FILTER_MODES = ["has_all", "has_any", "=", "has_only"] as const satisfies SelectFilterMode[];

interface ModeControlProps {
  readonly columnName: string;
  readonly mode: SelectFilterMode;
  readonly onModeChange: (mode: SelectFilterMode) => void;
}

export const SelectFilterModeControl: VoidComponent<ModeControlProps> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  return (
    <div class="text-sm">
      <SegmentedControl
        name={filterFieldNames.get(`mode_${props.columnName}`)}
        items={SELECT_FILTER_MODES.map((m) => ({
          value: m,
          label: () => (
            <span title={t(`tables.filter.set_operation.${m}.explanation`)}>
              {t(`tables.filter.set_operation.${m}.short`)}
            </span>
          ),
        }))}
        value={props.mode}
        onValueChange={(mode) => props.onModeChange(mode as SelectFilterMode)}
        small
      />
    </div>
  );
};
