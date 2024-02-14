import {htmlAttributes, useLangFunc} from "components/utils";
import {JSX, ParentComponent, VoidComponent, splitProps} from "solid-js";
import {ACTION_ICONS} from "./icons";

/**
 * Wrapper for the native `<button>` element.
 * This component adds `type="button"` which prevents the button from submitting a form it is in.
 */
export const Button: ParentComponent<htmlAttributes.button> = (props) => (
  // eslint-disable-next-line no-restricted-syntax
  <button type="button" {...props} aria-disabled={props.disabled} />
);

interface EditButtonProps extends htmlAttributes.button {
  readonly label?: JSX.Element;
}

export const EditButton: VoidComponent<EditButtonProps> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["label"]);
  const t = useLangFunc();
  return (
    <Button {...buttonProps}>
      <ACTION_ICONS.edit class="inlineIcon strokeIcon text-current" />{" "}
      {props.label === undefined ? t("actions.edit") : props.label}
    </Button>
  );
};
