import {htmlAttributes, useLangFunc} from "components/utils";
import {JSX, ParentComponent, Show, VoidComponent, createSignal, splitProps} from "solid-js";
import {SmallSpinner} from "./Spinner";
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

interface DeleteButtonProps extends htmlAttributes.button {
  readonly label?: JSX.Element;
  readonly confirm?: () => Promise<boolean | undefined> | boolean | undefined;
  readonly delete?: () => Promise<void> | void;
}

export const DeleteButton: VoidComponent<DeleteButtonProps> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["label", "confirm", "delete"]);
  const t = useLangFunc();
  const [isDeleting, setIsDeleting] = createSignal(false);
  async function onClick(e: MouseEvent) {
    if (!props.delete) {
      return;
    }
    const skipConfirmation = !props.confirm || (e.ctrlKey && e.altKey);
    if (!skipConfirmation && !(await props.confirm())) {
      return;
    }
    setIsDeleting(true);
    try {
      await props.delete();
    } finally {
      setIsDeleting(false);
    }
  }
  return (
    <Button onClick={onClick} {...buttonProps} disabled={buttonProps.disabled || isDeleting()}>
      <Show when={isDeleting()}>
        <SmallSpinner />
      </Show>{" "}
      <ACTION_ICONS.delete class="inlineIcon text-current" />{" "}
      {props.label === undefined ? t("actions.delete") : props.label}
    </Button>
  );
};
