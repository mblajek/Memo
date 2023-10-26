import {useLangFunc} from "components/utils";
import {IntColumnFilter} from "data-access/memo-api/tquery/types";
import {Show, VoidComponent, createComputed, createSignal} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {FilterControlProps} from "./types";

type IntRangeFilter =
  | {
      type: "op";
      op: "&";
      val: [(IntColumnFilter & {op: ">="}) | "always", (IntColumnFilter & {op: "<="}) | "always"];
    }
  | (IntColumnFilter & {op: "="});

interface Props extends FilterControlProps<IntRangeFilter> {}

export const IntFilterControl: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
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
    const l = lower() ? Number(lower()) : undefined;
    const u = upper() ? Number(upper()) : undefined;
    if (l !== undefined && u !== undefined && l > u) {
      // Clear the upper range and let the computation run again.
      setUpper("");
      return;
    }
    if (l === undefined && u === undefined) {
      return props.setFilter(undefined);
    }
    if (l !== undefined && l === u) {
      return props.setFilter({type: "column", column: props.name, op: "=", val: l});
    }
    return props.setFilter({
      type: "op",
      op: "&",
      val: [
        l !== undefined
          ? {
              type: "column",
              column: props.name,
              op: ">=",
              val: l,
            }
          : "always",
        u !== undefined
          ? {
              type: "column",
              column: props.name,
              op: "<=",
              val: u,
            }
          : "always",
      ],
    });
  });
  const canSyncRange = () => true;
  const syncActive = () => lower() || upper();
  return (
    <div
      class="grid gap-0.5 gap-x-1 items-baseline"
      style={{"grid-template-columns": `auto ${canSyncRange() ? "auto" : ""} 1fr`}}
    >
      <div>{t("range.min")}</div>
      <Show when={canSyncRange()}>
        <div
          class={s.valuesSyncer}
          classList={{[s.inactive!]: !syncActive()}}
          title={syncActive() ? t("tables.filter.click_to_sync_number_range") : undefined}
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
        <input
          name={`table_filter_from_${props.name}`}
          type="number"
          class="h-full w-full border rounded"
          max={upper()}
          value={lower()}
          onInput={({target: {value}}) => setLower(value)}
        />
      </div>
      <div>{t("range.max")}</div>
      <div class={s.wideEdit}>
        <input
          name={`table_filter_to_${props.name}`}
          type="number"
          class="h-full w-full border rounded"
          min={lower()}
          value={upper()}
          onInput={({target: {value}}) => setUpper(value)}
        />
      </div>
    </div>
  );
};
