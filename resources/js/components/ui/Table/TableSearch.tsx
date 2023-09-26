import {useLangFunc} from "components/utils";
import {Component, ParentProps, createComputed, createSignal} from "solid-js";
import {tableStyle as ts, useTable} from ".";

interface Props {
  placeholder?: string;
}

export const TableSearch: Component<ParentProps<Props>> = (props) => {
  const t = useLangFunc();
  const table = useTable();
  const [query, setQuery] = createSignal(table.getState().globalFilter);
  createComputed(() => table.setGlobalFilter(query()));
  return (
    <div class={ts.searchBar}>
      <input
        name="table_global_search"
        type="search"
        placeholder={"chwilowo zepsute" || props.placeholder || t("tables.search")}
        value={query()}
        onInput={({target: {value}}) => setQuery(value)}
      />
    </div>
  );
};
