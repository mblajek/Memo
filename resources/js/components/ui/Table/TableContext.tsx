import {Table} from "@tanstack/solid-table";
import {createContext, useContext} from "solid-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TableContext = createContext<Table<any>>();

export const useTable = () => {
  const table = useContext(TableContext);
  if (!table) {
    throw new Error(`useTable must be used inside TableContextProvider.`);
  }
  return table;
};
