import {VoidComponent} from "solid-js";
import {htmlAttributes} from "../utils";

export const EM_DASH = "—";
export const EN_DASH = "–";

/** A long dash displayed in place of an empty value. */
export const EMPTY_VALUE_SYMBOL_STRING = EM_DASH;

/** A long dash displayed in place of an empty value. */
export const EmptyValueSymbol: VoidComponent<htmlAttributes.span> = (props) => (
  <span {...htmlAttributes.merge(props, {class: "text-grey-text"})}>{EMPTY_VALUE_SYMBOL_STRING}</span>
);

/** The non-breakable space. */
export const NBSP = "\u00a0";

export const CHECKBOX_UNCHECKED = "\u2610";
export const CHECKBOX_CHECKED = "\u2611";
export function CHECKBOX(checked: boolean) {
  return checked ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED;
}
