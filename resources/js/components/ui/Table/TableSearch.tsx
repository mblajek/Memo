import cx from "classnames";
import {Component, ParentProps, createEffect, createSignal} from "solid-js";
import {useTable, tableStyle} from ".";

type TableProps = {
  placeholder?: string;
};

export const TableSearch: Component<ParentProps<TableProps>> = props => {
  const [query, setQuery] = createSignal("");
  const table = useTable();
  createEffect(() => table.setGlobalFilter(query()));
  return <div class={cx(tableStyle.searchBar)}>
    <input
      type="search"
      placeholder={props.placeholder ?? "Szukaj"}
      value={query()}
      onInput={e => {
        e.preventDefault();
        setQuery(e.target.value);
      }}
    />
  </div>;
};
