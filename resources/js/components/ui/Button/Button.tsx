import {ParentComponent} from "solid-js";
import {htmlAttributes} from "../../utils";

/**
 * Wrapper for the native `<button>` element.
 * This component adds `type="button"` which prevents the button from submitting a form it is in.
 */
// eslint-disable-next-line no-restricted-syntax
export const Button: ParentComponent<htmlAttributes.button> = (props) => <button type="button" {...props} />;
