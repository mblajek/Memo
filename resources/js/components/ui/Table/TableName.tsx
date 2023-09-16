import {Component, JSX, Show} from "solid-js";
import {useTable} from ".";
import {Capitalize} from "../Capitalize";

export const TableName: Component<JSX.HTMLAttributes<HTMLSpanElement>> = (props) => {
  const table = useTable();
  return (
    <Show when={table.options.meta?.translations?.tableName()}>
      {(text) => <Capitalize {...props} text={text()} />}
    </Show>
  );
};
