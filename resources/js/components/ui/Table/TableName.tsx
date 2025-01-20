import {useTable} from "components/ui/Table/TableContext";
import {htmlAttributes} from "components/utils/html_attributes";
import {Show, VoidComponent} from "solid-js";
import {Capitalize} from "../Capitalize";

export const TableName: VoidComponent<htmlAttributes.span> = (props) => {
  const table = useTable();
  return (
    <Show when={table.options.meta?.translations?.tableName()}>
      {(text) => <Capitalize {...props} text={text()} />}
    </Show>
  );
};
