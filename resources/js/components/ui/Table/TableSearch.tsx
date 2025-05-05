import {useTable} from "components/ui/Table/TableContext";
import {cx} from "components/utils/classnames";
import {debouncedFilterTextAccessor} from "components/utils/debounce";
import {useLangFunc} from "components/utils/lang";
import {ParentProps, VoidComponent, createComputed, createSignal} from "solid-js";
import {SearchInput} from "../SearchInput";

interface Props {
  readonly divClass?: string;
  readonly placeholder?: string;
}

export const TableSearch: VoidComponent<ParentProps<Props>> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const [filter, setFilter] = createSignal(table.getState().globalFilter as string);
  // eslint-disable-next-line solid/reactivity
  const debouncedFilter = debouncedFilterTextAccessor(filter);
  createComputed(() => table.setGlobalFilter(debouncedFilter()));
  createComputed(() => setFilter(table.getState().globalFilter as string));
  return (
    <SearchInput
      divClass={cx("flex items-stretch", props.divClass)}
      name="table_global_search"
      class={filter() ? "border-memo-active" : undefined}
      placeholder={props.placeholder || t("actions.search")}
      value={filter()}
      onValueChange={setFilter}
    />
  );
};
