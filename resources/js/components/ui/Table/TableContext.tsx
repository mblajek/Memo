import {Table} from "@tanstack/solid-table";
import {createContext, ParentComponent, useContext} from "solid-js";

type ProviderProps = {
  /** The table specified for the provider. Must not change. */
  table: Table<any>;
}

const TableContext = createContext<Table<unknown>>(undefined);

export const TableContextProvider: ParentComponent<ProviderProps> = props => {
  // Table does not change.
  // eslint-disable-next-line solid/reactivity
  return <TableContext.Provider value={props.table}>
    {props.children}
  </TableContext.Provider>;
};

export const useTable = () => {
  const table = useContext(TableContext);
  if (!table)
    throw new Error(`useTable must be used inside TableContextProvider.`);
  return table;
};
