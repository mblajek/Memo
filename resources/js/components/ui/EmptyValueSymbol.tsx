import {EMPTY_VALUE_SYMBOL_STRING} from "components/ui/symbols";
import {htmlAttributes} from "components/utils/html_attributes";
import {VoidComponent} from "solid-js";

/** A long dash displayed in place of an empty value. */
export const EmptyValueSymbol: VoidComponent<htmlAttributes.span> = (props) => (
  <span {...htmlAttributes.merge(props, {class: "text-grey-text"})}>{EMPTY_VALUE_SYMBOL_STRING}</span>
);
