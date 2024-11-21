import {Button} from "components/ui/Button";
import {DateInput} from "components/ui/DateInput";
import {createHoverSignal, hoverEvents, hoverSignal} from "components/ui/hover_signal";
import {title} from "components/ui/title";
import {cx, useLangFunc} from "components/utils";
import {DateColumnFilter, DateTimeColumnFilter} from "data-access/memo-api/tquery/types";
import {dateTimeToISO, dateToISO} from "data-access/memo-api/utils";
import {DateTime} from "luxon";
import {Show, VoidComponent, createComputed, createMemo} from "solid-js";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {FilterControlProps} from "./types";

type _Directives = typeof title | typeof hoverSignal;

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
  const getInputsData = createMemo(() => {
    const l = lower() ? DateTime.fromISO(lower()) : undefined;
    const u = upper() ? DateTime.fromISO(upper()) : undefined;
    return {l, u, conflict: l && u && l > u};
  });
  createComputed(() => {
    const inputs = getInputsData();
    if (inputs.conflict) {
      return;
    }
    let {l, u} = inputs;
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
  const hoverSignal = createHoverSignal();
  const canSyncRange = () => inputsType() === "date";
  const syncPossible = () => !!lower() || !!upper();
  const currentSyncType = createMemo(() => {
    const {l, u} = getInputsData();
    if (!canSyncRange() || !l || !u) {
      return undefined;
    }
    return l.hasSame(u, "day")
      ? "day"
      : l.hasSame(u, "month") && l.day === 1 && u.hasSame(u.endOf("month"), "day")
        ? "month"
        : undefined;
  });
  return (
    <div
      class={cx(s.filter, "grid gap-0.5 items-baseline")}
      style={{"grid-template-columns": `auto ${canSyncRange() ? "auto" : ""} 1fr`}}
    >
      <div>{t("range.from")}</div>
      <Show when={canSyncRange()}>
        <Button
          class={cx(
            s.valuesSyncer,
            syncPossible()
              ? currentSyncType() === (hoverSignal() ? "day" : "month")
                ? s.high
                : undefined
              : s.inactive,
          )}
          title={[
            syncPossible()
              ? t(
                  currentSyncType() === "day"
                    ? "tables.filter.click_to_set_month_date_range"
                    : "tables.filter.click_to_sync_date_range",
                )
              : undefined,
            {hideOnClick: false},
          ]}
          onClick={() => {
            if (currentSyncType() === "day") {
              const day = getInputsData().l!;
              setLower(day.startOf("month").toISODate());
              setUpper(day.endOf("month").toISODate());
            } else if (lower()) {
              setUpper(lower());
            } else if (upper()) {
              setLower(upper());
            }
            // Only animate the syncer on the next hover.
            hoverSignal.setHover(false);
          }}
          {...hoverEvents(hoverSignal)}
        />
      </Show>
      <div class={cx(s.wideEdit, inputsType() === "date" ? s.dateInputContainer : s.dateTimeInputContainer)}>
        <DateInput
          name={filterFieldNames.get(`from_${props.schema.name}`)}
          type={inputsType()}
          outerClass="w-full"
          class="min-h-small-input"
          max={getInputsData().conflict ? undefined : upper()}
          value={lower()}
          onInput={({target: {value, validity}}) => {
            if (!validity.badInput) {
              setLower(value);
            }
          }}
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
          onInput={({target: {value, validity}}) => {
            if (!validity.badInput) {
              setUpper(value);
            }
          }}
        />
      </div>
    </div>
  );
};
