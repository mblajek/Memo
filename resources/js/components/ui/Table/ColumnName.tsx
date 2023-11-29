import {ColumnDef} from "@tanstack/solid-table";
import {Show, VoidComponent} from "solid-js";
import {TranslatedText} from "../TranslatedText";
import {useTable} from "./TableContext";

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly def: ColumnDef<any>;
}

/**
 * Component displaying the column name, taken from column meta.columnName if present,
 * otherwise from table meta.translations, or finally from the column id.
 */
export const ColumnName: VoidComponent<Props> = (props) => {
  const table = useTable();
  return (
    <span class="wrapText">
      <Show
        when={props.def.meta?.tquery?.devColumn}
        fallback={
          <TranslatedText
            override={props.def.meta?.columnName}
            langFunc={[table.options.meta?.translations?.columnNames, props.def.id]}
            capitalize
            fallbackCode={props.def.id}
          />
        }
      >
        <span class="wrapTextAnywhere" title="Unconfigured data column shown in DEV mode">
          <span class="text-xs">DEV</span> {props.def.id}
        </span>
      </Show>
    </span>
  );
};
