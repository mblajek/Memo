import {useLangFunc} from "components/utils";
import {BoolColumnFilter} from "data-access/memo-api/tquery";
import {FiFilter} from 'solid-icons/fi';
import {FilterControl, UnnamedColumnFilter} from ".";

const OPTIONS = new Map<string, UnnamedColumnFilter<BoolColumnFilter> | undefined>()
  .set("-", undefined)
  .set("t", {type: "column", op: "=", val: true})
  .set("f", {type: "column", op: "=", val: false});

export const BoolFilterControl: FilterControl<BoolColumnFilter> = props => {
  const t = useLangFunc();
  return <div class="w-full flex items-center gap-0.5">
    <select
      class="flex-grow border rounded"
      value={String(props.filter?.val ?? "-")[0]}
      onChange={e => props.setFilter(OPTIONS.get(e.target.value))}>
      <option value="-" />
      <option value="t">{t("bool_values.yes")}</option>
      <option value="f">{t("bool_values.no")}</option>
    </select>
    <FiFilter
      classList={{"text-black": true, "text-opacity-30": !props.filter}}
      onClick={() => props.setFilter(undefined)}
    />
  </div>;
};
