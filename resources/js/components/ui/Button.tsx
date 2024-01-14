import {htmlAttributes, useLangFunc} from "components/utils";
import {ParentComponent, VoidComponent} from "solid-js";
import {ACTION_ICONS} from "./icons";

/**
 * Wrapper for the native `<button>` element.
 * This component adds `type="button"` which prevents the button from submitting a form it is in.
 */
// eslint-disable-next-line no-restricted-syntax
export const Button: ParentComponent<htmlAttributes.button> = (props) => <button type="button" {...props} />;

export const EditButton: VoidComponent<htmlAttributes.button> = (props) => {
  const t = useLangFunc();
  return (
    <Button {...props}>
      <ACTION_ICONS.edit class="inlineIcon strokeIcon text-current" /> {t("actions.edit")}
    </Button>
  );
};
