import {cx, debouncedFilterTextAccessor, useLangFunc} from "components/utils";
import {ParentProps, VoidComponent, createComputed, createSignal} from "solid-js";
import {useTable} from ".";
import {SearchInput} from "../SearchInput";

interface Props {
  readonly divClass?: string;
  readonly placeholder?: string;
}

export const TableSearch: VoidComponent<ParentProps<Props>> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const [filter, setFilter] = createSignal(table.getState().globalFilter);
  // eslint-disable-next-line solid/reactivity
  const debouncedFilter = debouncedFilterTextAccessor(filter);
  createComputed(() => table.setGlobalFilter(debouncedFilter()));
  createComputed(() => setFilter(table.getState().globalFilter));
  return (
    <SearchInput
      divClass={cx("flex items-stretch", props.divClass)}
      name="table_global_search"
      class={cx("px-1", filter() ? "border-memo-active" : undefined)}
      placeholder={props.placeholder || t("actions.search")}
      value={filter()}
      onValueChange={setFilter}
    />
  );
};
