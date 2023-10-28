import {htmlAttributes} from "components/utils";
import {Show, VoidComponent} from "solid-js";
import {useTable} from ".";
import {Capitalize} from "../Capitalize";

export const TableName: VoidComponent<htmlAttributes.span> = (props) => {
  const table = useTable();
  return (
    <Show when={table.options.meta?.translations?.tableName()}>
      {(text) => <Capitalize {...props} text={text()} />}
    </Show>
  );
};
