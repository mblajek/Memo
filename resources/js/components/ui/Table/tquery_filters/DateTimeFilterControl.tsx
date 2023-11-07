import {cx, useLangFunc} from "components/utils";
import {DateColumnFilter, DateTimeColumnFilter} from "data-access/memo-api/tquery/types";
import {dateTimeToISO, dateToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";
import {Show, VoidComponent, createComputed, createSignal} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {FilterControlProps} from "./types";

type DateTimeRangeFilter =
  | {
      type: "op";
      op: "&";
      val: [
        (DateColumnFilter & DateTimeColumnFilter & {op: ">="}) | "always",
        (DateColumnFilter & DateTimeColumnFilter & {op: "<="}) | "always",
      ];
    }
  | (DateColumnFilter & {op: "="});

interface DateTimeColumnProps extends FilterControlProps<DateTimeRangeFilter> {
  columnType?: "datetime";
  /** Whether the inputs should set date and time. Default is only date. */
  useDateTimeInputs?: boolean;
}

interface DateColumnProps extends FilterControlProps<DateTimeRangeFilter> {
  columnType: "date";
}

type Props = DateColumnProps | DateTimeColumnProps;

/**
 * Filter for a date and datetime columns.
 * TODO: Add support for nullable columns.
 */
export const DateTimeFilterControl: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const columnType = () => props.columnType || "datetime";
  const inputsType = () => (props.columnType === "datetime" && props.useDateTimeInputs ? "datetime-local" : "date");
  const [lower, setLower] = createSignal("");
  const [upper, setUpper] = createSignal("");
  createComputed(() => {
    if (!props.filter) {
      setLower("");
      setUpper("");
    }
    // Ignore other external filter changes.
  });
  createComputed(() => {
    let l = lower() ? DateTime.fromISO(lower()) : undefined;
    let u = upper() ? DateTime.fromISO(upper()) : undefined;
    if (l && u && l > u) {
      // Clear the upper range and let the computation run again.
      setUpper("");
      return;
    }
    if (!l && !u) {
      return props.setFilter(undefined);
    }
    if (columnType() === "datetime" && inputsType() === "date") {
      // Prepare for sending datetime spanning the edge day.
      l = l?.startOf("day");
      u = u?.endOf("day");
    }
    let lISO: string | undefined;
    let uISO: string | undefined;
    if (columnType() === "date") {
      lISO = l && dateToISO(l);
      uISO = u && dateToISO(u);
    } else {
      lISO = l && dateTimeToISO(l);
      uISO = u && dateTimeToISO(u);
    }
    if (columnType() === "date" && lISO && lISO === uISO) {
      return props.setFilter({type: "column", column: props.name, op: "=", val: lISO});
    }
    return props.setFilter({
      type: "op",
      op: "&",
      val: [
        lISO
          ? {
              type: "column",
              column: props.name,
              op: ">=",
              val: lISO,
            }
          : "always",
        uISO
          ? {
              type: "column",
              column: props.name,
              op: "<=",
              val: uISO,
            }
          : "always",
      ],
    });
  });
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
          class={s.valuesSyncer}
          classList={{[s.inactive!]: !syncActive()}}
          title={syncActive() ? t("tables.filter.click_to_sync_date_range") : undefined}
          onClick={() => {
            if (lower()) {
              setUpper(lower());
            } else if (upper()) {
              setLower(upper());
            }
          }}
        />
      </Show>
      <div class={cx(s.wideEdit, inputsType() === "date" ? s.dateInputContainer : s.dateTimeInputContainer)}>
        <input
          name={`table_filter_from_${props.name}`}
          type={inputsType()}
          class="h-full w-full border border-input-border rounded"
          max={upper()}
          value={lower()}
          onInput={({target: {value}}) => setLower(value)}
        />
      </div>
      <div>{t("range.to")}</div>
      <div class={cx(s.wideEdit, inputsType() === "date" ? s.dateInputContainer : s.dateTimeInputContainer)}>
        <input
          name={`table_filter_to_${props.name}`}
          type={inputsType()}
          class="h-full w-full border border-input-border rounded"
          min={lower()}
          value={upper()}
          onInput={({target: {value}}) => setUpper(value)}
        />
      </div>
    </div>
  );
};
