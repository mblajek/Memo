import {cx, useLangFunc} from "components/utils";
import {ParentProps, VoidComponent} from "solid-js";
import {useTable} from ".";
import {SearchInput} from "../SearchInput";

interface Props {
  readonly divClass?: string;
  readonly placeholder?: string;
}

export const TableSearch: VoidComponent<ParentProps<Props>> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const globalFilter = (): string => table.getState().globalFilter;
  return (
    <SearchInput
      divClass={cx("flex items-stretch", props.divClass)}
      name="table_global_search"
      class={cx("px-1", globalFilter() ? "border-memo-active" : undefined)}
      placeholder={props.placeholder || t("actions.search")}
      value={globalFilter()}
      onInput={({target: {value}}) => table.setGlobalFilter(value)}
    />
  );
};
