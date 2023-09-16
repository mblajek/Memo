import cx from "classnames";
import {useLangFunc} from "components/utils";
import {Component, ParentProps, createComputed, createSignal, splitProps} from "solid-js";
import {tableStyle, useTable} from ".";
import {JSX} from "solid-js";

interface Props extends JSX.HTMLAttributes<HTMLDivElement> {
  placeholder?: string;
}

export const TableSearch: Component<ParentProps<Props>> = (props) => {
  const [lProps, divProps] = splitProps(props, ["placeholder"]);
  const t = useLangFunc();
  const table = useTable();
  const [query, setQuery] = createSignal(table.getState().globalFilter);
  createComputed(() => table.setGlobalFilter(query()));
  return (
    <div {...divProps} class={cx(tableStyle.searchBar, divProps.class)}>
      <input
        name="table_global_search"
        type="search"
        placeholder={lProps.placeholder || t("tables.search")}
        value={query()}
        onInput={({target: {value}}) => setQuery(value)}
      />
    </div>
  );
};
