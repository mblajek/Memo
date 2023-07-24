import {NON_NULLABLE, useLangFunc} from "components/utils";
import {BoolOpFilter, DateColumnFilter, DateTimeColumnFilter} from "data-access/memo-api/tquery";
import {Component, createMemo} from "solid-js";
import {FilterControlProps} from ".";
import {tableStyle as ts} from "..";

const OPS = [">=", "<="] as const;

type RangeOp = typeof OPS[number];

interface RangeSideFilter extends DateColumnFilter, DateTimeColumnFilter {
  type: "column";
  op: RangeOp;
}

export interface DateTimeRangeFilter extends BoolOpFilter {
  op: "&",
  val: RangeSideFilter[],
}

interface Props extends FilterControlProps<DateTimeRangeFilter> {
  /** The data type, datetime by default. */
  columnType?: "date" | "datetime";
}

export const DateTimeFilterControl: Component<Props> = props => {
  const t = useLangFunc();
  function toDateTimeInput(date: Date | undefined) {
    return date?.toLocaleString("sv").slice(0, props.columnType === "date" ? 10 : 16)
      .replace(" ", "T") || "";
  }
  const inputType = () => props.columnType === "date" ? "date" : "datetime-local";
  const toDate = (val: string | undefined) => val ? new Date(val) : undefined;
  const findVal = (op: RangeOp) => toDate(props.filter?.val.find(f => f.op === op)?.val);
  // Disable equality check to avoid problems with the input value being stale when
  // max is set to below min.
  const lower = createMemo(() => findVal(">="), undefined, {equals: false});
  const upper = createMemo(() => findVal("<="), undefined, {equals: false});
  function setOrDisableFilter(op: RangeOp, val: string) {
    const range = [lower(), upper()];
    range[OPS.indexOf(op)] = toDate(val);
    if (range[0] && range[1] && range[0] > range[1])
      range[1] = undefined;
    props.setFilter(range[0] || range[1] ? {
      type: "op",
      op: "&",
      val: OPS.map<RangeSideFilter | undefined>((op, i) => range[i] ? {
        type: "column",
        column: props.name,
        op,
        val: range[i]!.toISOString(),
      } : undefined).filter(NON_NULLABLE),
    } : undefined);
  }
  return <div
    class="grid gap-0.5 gap-x-1 items-baseline"
    style={{"grid-template-columns": "auto 1fr"}}
  >
    <div>{t("range.from")}</div>
    <div class={ts.wideEdit}>
      <input
        name={`table_filter_from_${props.name}`}
        type={inputType()}
        class="h-full w-full border rounded"
        max={toDateTimeInput(upper())}
        value={toDateTimeInput(lower())}
        onInput={({target: {value}}) => setOrDisableFilter(">=", value)}
      />
    </div>
    <div>{t("range.to")}</div>
    <div class={ts.wideEdit}>
      <input
        name={`table_filter_to_${props.name}`}
        type={inputType()}
        class="h-full w-full border rounded"
        min={toDateTimeInput(lower())}
        value={toDateTimeInput(upper())}
        onInput={({target: {value}}) => setOrDisableFilter("<=", value)}
      />
    </div>
  </div>;
};
