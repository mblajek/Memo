import {DateInput} from "components/ui/DateInput";
import {title} from "components/ui/title";
import {cx, useLangFunc} from "components/utils";
import {DateColumnFilter, DateTimeColumnFilter} from "data-access/memo-api/tquery/types";
import {dateTimeToISO, dateToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";
import {Show, VoidComponent, createComputed} from "solid-js";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {FilterControlProps} from "./types";

type _Directives = typeof title;

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

interface Props extends FilterControlProps<DateTimeRangeFilter> {
  /** Whether to use datetime-local inputs for datetime columns. Default: false (use date inputs). */
  readonly useDateTimeInputs?: boolean;
}

/**
 * Filter for a date and datetime columns.
 * TODO: Add support for nullable columns.
 */
export const DateTimeFilterControl: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
  const columnType = () => props.schema.type as "date" | "datetime";
  const inputsType = () => (columnType() === "datetime" && props.useDateTimeInputs ? "datetime-local" : "date");
  const {
    lower: [lower, setLower],
    upper: [upper, setUpper],
  } = getFilterStateSignal({
    // eslint-disable-next-line solid/reactivity
    column: props.column.id,
    initial: {lower: "", upper: ""},
    filter: () => props.filter,
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
      return props.setFilter({type: "column", column: props.schema.name, op: "=", val: lISO});
    }
    return props.setFilter({
      type: "op",
      op: "&",
      val: [
        lISO
          ? {
              type: "column",
              column: props.schema.name,
              op: ">=",
              val: lISO,
            }
          : "always",
        uISO
          ? {
              type: "column",
              column: props.schema.name,
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
      class={cx(s.filter, "grid gap-0.5 items-baseline")}
      style={{"grid-template-columns": `auto ${canSyncRange() ? "auto" : ""} 1fr`}}
    >
      <div>{t("range.from")}</div>
      <Show when={canSyncRange()}>
        <div
          class={s.valuesSyncer}
          classList={{[s.inactive!]: !syncActive()}}
          use:title={syncActive() ? t("tables.filter.click_to_sync_date_range") : undefined}
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
        <DateInput
          name={filterFieldNames.get(`from_${props.schema.name}`)}
          type={inputsType()}
          outerClass="w-full"
          class="min-h-small-input"
          max={upper()}
          value={lower()}
          onInput={({target: {value}}) => setLower(value)}
        />
      </div>
      <div>{t("range.to")}</div>
      <div class={cx(s.wideEdit, inputsType() === "date" ? s.dateInputContainer : s.dateTimeInputContainer)}>
        <DateInput
          name={filterFieldNames.get(`to_${props.schema.name}`)}
          type={inputsType()}
          outerClass="w-full"
          class="min-h-small-input"
          min={lower()}
          value={upper()}
          onInput={({target: {value}}) => setUpper(value)}
        />
      </div>
    </div>
  );
};
