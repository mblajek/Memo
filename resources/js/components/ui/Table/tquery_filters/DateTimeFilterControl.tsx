import {NON_NULLABLE, cx, toLocalDateISOString, toLocalISOString, useLangFunc} from "components/utils";
import {BoolOpFilter, DateColumnFilter, DateTimeColumnFilter} from "data-access/memo-api/tquery";
import {Component, Show, createMemo} from "solid-js";
import {FilterControlProps} from ".";
import {tableStyle as ts} from "..";

const OPS = [">=", "<="] as const;

type RangeOp = (typeof OPS)[number];

interface RangeSideFilter extends DateColumnFilter, DateTimeColumnFilter {
  type: "column";
  op: RangeOp;
}

export interface DateTimeRangeFilter extends BoolOpFilter {
  op: "&";
  val: RangeSideFilter[];
}

interface DateTimeColumnProps extends FilterControlProps<DateTimeRangeFilter> {
  columnType?: "datetime";
  /** Whether the inputs should only set date (and no time). Default is false. */
  useDateOnlyInputs?: boolean;
}

interface DateColumnProps extends FilterControlProps<DateTimeRangeFilter> {
  columnType: "date";
}

type Props = DateColumnProps | DateTimeColumnProps;

export const DateTimeFilterControl: Component<Props> = (props) => {
  const t = useLangFunc();
  const columnType = () => props.columnType || "datetime";
  const inputsType = () => (props.columnType === "date" || props.useDateOnlyInputs ? "date" : "datetime-local");
  function toInputValue(date: Date | undefined) {
    return date
      ? inputsType() === "date"
        ? toLocalDateISOString(date)
        : toLocalISOString(date)
            // Cut off seconds.
            .slice(0, -3)
      : "";
  }
  function findVal(op: RangeOp) {
    const val = props.filter?.val.find((f) => f.op === op)?.val;
    return val ? new Date(val) : undefined;
  }
  // Disable equality check to avoid problems with the input value being stale when
  // max is set to below min.
  const lower = createMemo(() => findVal(">="), undefined, {equals: false});
  const upper = createMemo(() => findVal("<="), undefined, {equals: false});
  function setOrDisableFilter(op: RangeOp, inputValue: string) {
    const range = [lower(), upper()];
    range[OPS.indexOf(op)] = inputValue ? new Date(inputValue) : undefined;
    if (range[0] && range[1] && range[0] > range[1]) {
      range[1] = undefined;
    }
    function toFilterVal(op: RangeOp, date: Date) {
      if (columnType() === "date") {
        return toLocalDateISOString(date);
      }
      if (inputsType() === "date") {
        // Input is date but backend expects datetime. Use T00:00:00.000 for the lower range
        // and T23:59:59.999 for the upper range (the times in local time zone).
        const d = new Date(date);
        if (op === ">=") {
          d.setHours(0, 0, 0, 0);
        } else {
          d.setHours(23, 59, 59, 999);
        }
        return d.toISOString();
      }
      return date.toISOString();
    }
    props.setFilter(
      range[0] || range[1]
        ? {
            type: "op",
            op: "&",
            val: OPS.map<RangeSideFilter | undefined>((op, i) =>
              range[i]
                ? {
                    type: "column",
                    column: props.name,
                    op,
                    val: toFilterVal(op, range[i]!),
                  }
                : undefined,
            ).filter(NON_NULLABLE),
          }
        : undefined,
    );
  }
  const setLowerInput = (inputValue: string) => setOrDisableFilter(">=", inputValue);
  const setUpperInput = (inputValue: string) => setOrDisableFilter("<=", inputValue);
  const canSyncRange = () => inputsType() === "date";
  const syncActive = () => !!lower() || !!upper();
  return (
    <div
      class="grid gap-0.5 gap-x-1 items-baseline"
      style={{"grid-template-columns": `auto ${canSyncRange() ? "auto" : ""} 1fr`}}
    >
      <div>{t("range.from")}</div>
      <Show when={canSyncRange()}>
        <div
          class={ts.valuesSyncer}
          classList={{[ts.inactive!]: !syncActive()}}
          title={syncActive() ? t("tables.filter.click_to_sync_date_range") : undefined}
          onClick={() => {
            if (lower()) {
              setUpperInput(toInputValue(lower()));
            } else if (upper()) {
              setLowerInput(toInputValue(upper()));
            }
          }}
        />
      </Show>
      <div class={cx(ts.wideEdit, inputsType() === "date" ? ts.dateInputContainer : ts.dateTimeInputContainer)}>
        <input
          name={`table_filter_from_${props.name}`}
          type={inputsType()}
          class="h-full w-full border rounded"
          max={toInputValue(upper())}
          value={toInputValue(lower())}
          onInput={({target: {value}}) => setLowerInput(value)}
        />
      </div>
      <div>{t("range.to")}</div>
      <div class={cx(ts.wideEdit, inputsType() === "date" ? ts.dateInputContainer : ts.dateTimeInputContainer)}>
        <input
          name={`table_filter_to_${props.name}`}
          type={inputsType()}
          class="h-full w-full border rounded"
          min={toInputValue(lower())}
          value={toInputValue(upper())}
          onInput={({target: {value}}) => setUpperInput(value)}
        />
      </div>
    </div>
  );
};
