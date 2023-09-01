import {ColumnDef} from "@tanstack/solid-table";
import {Component, Show} from "solid-js";
import {Capitalize} from "../Capitalize";
import {useTable} from "./TableContext";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  def: ColumnDef<any>;
}

/**
 * Component displaying the column name, taken from column meta.columnName if present,
 * otherwise from table meta.translations, or finally from the column id.
 */
export const ColumnName: Component<Props> = (props) => {
  const table = useTable();
  return (
    <Show
      when={props.def.meta?.columnName}
      fallback={
        <Show
          when={table.options.meta?.translations?.headers?.(props.def.id || "", {defaultValue: ""})}
          fallback={props.def.id}
        >
          {(columnName) => <Capitalize text={columnName()} />}
        </Show>
      }
    >
      {(columnName) => <>{columnName()()}</>}
    </Show>
  );
};
