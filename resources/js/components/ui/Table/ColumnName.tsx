import {ColumnDef} from "@tanstack/solid-table";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Match, Switch, VoidComponent} from "solid-js";
import {Capitalize} from "../Capitalize";
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
  const attributes = useAttributes();
  const table = useTable();
  return (
    <span class="wrapText">
      <Switch>
        <Match when={props.def.meta?.tquery?.devColumn}>
          <span class="wrapTextAnywhere" title="Unconfigured data column shown in DEV mode">
            <span class="text-xs">DEV</span> {props.def.id}
          </span>
        </Match>
        <Match when={props.def.meta?.tquery?.attributeId}>
          {(attributeId) => <Capitalize text={attributes()?.getById(attributeId()).label} />}
        </Match>
        <Match when={true}>
          <TranslatedText
            override={props.def.meta?.columnName}
            langFunc={
              props.def.id && table.options.meta?.translations
                ? (o) => table.options.meta!.translations!.columnName(props.def.id!, o)
                : undefined
            }
            capitalize
            fallbackCode={props.def.id}
          />
        </Match>
      </Switch>
    </span>
  );
};
