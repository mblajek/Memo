import {NON_NULLABLE, useLangFunc} from "components/utils";
import {BoolOpFilter, DecimalColumnFilter} from "data-access/memo-api/tquery";
import {Component, Show, createMemo} from "solid-js";
import {FilterControlProps} from ".";
import {tableStyle as ts} from "..";

const OPS = [">=", "<="] as const;

type RangeOp = (typeof OPS)[number];

interface RangeSideFilter extends DecimalColumnFilter {
  type: "column";
  op: RangeOp;
}

export interface DecimalRangeFilter extends BoolOpFilter {
  op: "&";
  val: RangeSideFilter[];
}

interface Props extends FilterControlProps<DecimalRangeFilter> {
  columnType: "decimal0" | "decimal2";
}

export const DecimalFilterControl: Component<Props> = (props) => {
  const t = useLangFunc();
  const numDecimalDigits = () => (props.columnType === "decimal0" ? 0 : 2);
  const step = () => (props.columnType === "decimal0" ? 1 : 0.05);
  function toInputValue(value: number | undefined) {
    return value === undefined ? "" : value.toFixed(numDecimalDigits());
  }
  const findVal = (op: RangeOp) => props.filter?.val.find((f) => f.op === op)?.val;
  // Disable equality check to avoid problems with the input value being stale when
  // max is set to below min.
  const lower = createMemo(() => findVal(">="), undefined, {equals: false});
  const upper = createMemo(() => findVal("<="), undefined, {equals: false});
  function setOrDisableFilter(op: RangeOp, inputValue: string) {
    const range = [lower(), upper()];
    range[OPS.indexOf(op)] = inputValue ? Number(inputValue) : undefined;
    if (range[0] !== undefined && range[1] !== undefined && range[0] > range[1]) {
      range[1] = undefined;
    }
    props.setFilter(
      range[0] !== undefined || range[1] !== undefined
        ? {
            type: "op",
            op: "&",
            val: OPS.map<RangeSideFilter | undefined>((op, i) =>
              range[i] !== undefined
                ? {
                    type: "column",
                    column: props.name,
                    op,
                    val: range[i]!,
                  }
                : undefined,
            ).filter(NON_NULLABLE),
          }
        : undefined,
    );
  }
  const setLowerInput = (inputValue: string) => setOrDisableFilter(">=", inputValue);
  const setUpperInput = (inputValue: string) => setOrDisableFilter("<=", inputValue);
  const canSyncRange = () => true;
  const syncActive = () => lower() !== undefined || upper() !== undefined;
  return (
    <div
      class="grid gap-0.5 gap-x-1 items-baseline"
      style={{"grid-template-columns": `auto ${canSyncRange() ? "auto" : ""} 1fr`}}
    >
      <div>{t("range.min")}</div>
      <Show when={canSyncRange()}>
        <div
          class={ts.valuesSyncer}
          classList={{[ts.inactive!]: !syncActive()}}
          title={syncActive() ? t("tables.filter.click_to_sync_decimal_range") : undefined}
          onClick={() => {
            if (lower() !== undefined) {
              setUpperInput(toInputValue(lower()));
            } else if (upper() !== undefined) {
              setLowerInput(toInputValue(upper()));
            }
          }}
        />
      </Show>
      <div class={ts.wideEdit}>
        <input
          name={`table_filter_from_${props.name}`}
          type="number"
          class="h-full w-full border rounded"
          max={toInputValue(upper())}
          step={step()}
          value={toInputValue(lower())}
          onInput={({target: {value}}) => setLowerInput(value)}
        />
      </div>
      <div>{t("range.max")}</div>
      <div class={ts.wideEdit}>
        <input
          name={`table_filter_to_${props.name}`}
          type="number"
          class="h-full w-full border rounded"
          min={toInputValue(lower())}
          step={step()}
          value={toInputValue(upper())}
          onInput={({target: {value}}) => setUpperInput(value)}
        />
      </div>
    </div>
  );
};
