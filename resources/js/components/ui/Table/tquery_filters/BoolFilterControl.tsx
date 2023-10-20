import {useLangFunc} from "components/utils";
import {BoolColumnFilter} from "data-access/memo-api/tquery";
import {createMemo} from "solid-js";
import s from "./ColumnFilterController.module.scss";
import {FilterControl} from "./types";

export const BoolFilterControl: FilterControl<BoolColumnFilter> = (props) => {
  const defaultFilter = createMemo<BoolColumnFilter>(() => ({
    type: "column",
    column: props.name,
    op: "=",
    val: false,
  }));
  const t = useLangFunc();
  return (
    <div class={s.filterLine}>
      <select
        name={`table_filter_val_${props.name}`}
        class="flex-grow border rounded"
        value={String(props.filter?.val ?? "-")[0]}
        onChange={({target: {value}}) =>
          props.setFilter(value === "-" ? undefined : {...defaultFilter(), val: value === "t"})
        }
      >
        <option value="-" />
        <option value="t">{t("bool_values.yes")}</option>
        <option value="f">{t("bool_values.no")}</option>
      </select>
    </div>
  );
};
