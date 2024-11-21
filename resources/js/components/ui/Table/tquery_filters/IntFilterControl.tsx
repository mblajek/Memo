import {Button} from "components/ui/Button";
import {TextInput} from "components/ui/TextInput";
import {title} from "components/ui/title";
import {cx, useLangFunc} from "components/utils";
import {IntColumnFilter} from "data-access/memo-api/tquery/types";
import {Show, createComputed, createMemo} from "solid-js";
import {getFilterStateSignal} from "./column_filter_states";
import {useFilterFieldNames} from "./filter_field_names";
import s from "./filters.module.scss";
import {FilterControl} from "./types";

type _Directives = typeof title;

type IntRangeFilter =
  | {
      type: "op";
      op: "&";
      val: [(IntColumnFilter & {op: ">="}) | "always", (IntColumnFilter & {op: "<="}) | "always"];
    }
  | (IntColumnFilter & {op: "="});

/**
 * Filter for int columns.
 * TODO: Add support for nullable columns.
 */
export const IntFilterControl: FilterControl<IntRangeFilter> = (props) => {
  const t = useLangFunc();
  const filterFieldNames = useFilterFieldNames();
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
    const l = lower() ? Number(lower()) : undefined;
    const u = upper() ? Number(upper()) : undefined;
    return {l, u, conflict: l !== undefined && u !== undefined && l > u};
  });
  createComputed(() => {
    const {l, u, conflict} = getInputsData();
    if (conflict) {
      return;
    }
    if (l !== undefined && u !== undefined && l > u) {
      return;
    }
    if (l === undefined && u === undefined) {
      return props.setFilter(undefined);
    }
    if (l !== undefined && l === u) {
      return props.setFilter({type: "column", column: props.schema.name, op: "=", val: l});
    }
    return props.setFilter({
      type: "op",
      op: "&",
      val: [
        l !== undefined
          ? {
              type: "column",
              column: props.schema.name,
              op: ">=",
              val: l,
            }
          : "always",
        u !== undefined
          ? {
              type: "column",
              column: props.schema.name,
              op: "<=",
              val: u,
            }
          : "always",
      ],
    });
  });
  const canSyncRange = () => true;
  const syncPossible = () => (lower() || upper()) && lower() !== upper();
  return (
    <div
      class={cx(s.filter, "grid gap-0.5 items-baseline")}
      style={{"grid-template-columns": `auto ${canSyncRange() ? "auto" : ""} 1fr`}}
    >
      <div>{t("range.min")}</div>
      <Show when={canSyncRange()}>
        <Button
          class={cx(s.valuesSyncer, syncPossible() ? undefined : s.inactive)}
          title={syncPossible() ? t("tables.filter.click_to_sync_number_range") : undefined}
          onClick={() => {
            if (lower()) {
              setUpper(lower());
            } else if (upper()) {
              setLower(upper());
            }
          }}
        />
      </Show>
      <div class={s.wideEdit}>
        <TextInput
          name={filterFieldNames.get(`from_${props.schema.name}`)}
          type="number"
          class="w-full min-h-small-input"
          max={getInputsData().conflict ? undefined : upper()}
          value={lower()}
          onInput={({target: {value, validity}}) => {
            if (!validity.badInput) {
              setLower(value);
            }
          }}
        />
      </div>
      <div>{t("range.max")}</div>
      <div class={s.wideEdit}>
        <TextInput
          name={filterFieldNames.get(`to_${props.schema.name}`)}
          type="number"
          class="w-full min-h-small-input"
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
