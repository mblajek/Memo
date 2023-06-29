import {Table} from "@tanstack/solid-table";
import {createContext, ParentComponent, useContext} from "solid-js";

type ProviderProps<T> = {
  table: Table<T>;
}

const TableContext = createContext<Table<any> | null>(null);

export const TableContextProvider: ParentComponent<ProviderProps<any>> = props => {
  return <TableContext.Provider value={props.table}>
    {props.children}
  </TableContext.Provider>;
};

export const useTable = () => useContext(TableContext)!;
