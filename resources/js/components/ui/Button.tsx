import {htmlAttributes, useLangFunc} from "components/utils";
import {createSignal, JSX, ParentComponent, Show, splitProps, VoidComponent} from "solid-js";
import {SmallSpinner} from "./Spinner";
import {actionIcons} from "./icons";
import {mergeTitleDirectiveProps, title, TitleDirectiveType} from "./title";

const _DIRECTIVES_ = null && title;

interface ButtonProps extends Omit<htmlAttributes.button, "title"> {
  readonly title?: TitleDirectiveType;
}

/**
 * Wrapper for the native `<button>` element.
 * This component adds `type="button"` which prevents the button from submitting a form it is in.
 *
 * If the title is specified (even as undefined), the button is wrapped in a span with display:contents on which the title
 * is placed, using use:title. This is because the title would not appear on a disabled button.
 */
export const Button: ParentComponent<ButtonProps> = (allProps) => {
  const hasTitle = Object.hasOwn(allProps, "title");
  if (hasTitle) {
    const [props, buttonProps] = splitProps(allProps, ["title"]);
    let titleTriggerTarget: HTMLSpanElement | undefined;
    // eslint-disable-next-line solid/components-return-once
    return (
      <span ref={titleTriggerTarget} class="contents">
        {/* eslint-disable-next-line no-restricted-syntax */}
        <button
          type="button"
          {...buttonProps}
          aria-disabled={buttonProps.disabled}
          use:title={mergeTitleDirectiveProps(props.title, {triggerTarget: titleTriggerTarget})}
        />
      </span>
    );
  } else {
    // eslint-disable-next-line no-restricted-syntax, solid/components-return-once
    return <button type="button" {...(allProps as htmlAttributes.button)} aria-disabled={allProps.disabled} />;
  }
};

interface EditButtonProps extends ButtonProps {
  readonly label?: JSX.Element;
}

export const EditButton: VoidComponent<EditButtonProps> = (allProps) => {
  const [props, buttonProps] = splitProps(allProps, ["label"]);
  const t = useLangFunc();
  return (
    <Button {...buttonProps}>
      <actionIcons.Edit class="inlineIcon" /> {props.label === undefined ? t("actions.edit") : props.label}
    </Button>
  );
};

interface DeleteButtonProps<ConfirmResult> extends ButtonProps {
  readonly label?: JSX.Element;
  /**
   * The method to confirm delete with the user, typically via a dialog from confirmation.tsx.
   * If not provided, the delete function is called without confirmation.
   * The delete is considered confirmed, i.e. delete() is called, if confirm() resolves to a truthy value. That value is
   * just 'true' in a simple yes/no confirmation, but it can also be an object passing additional user choices from the
   * confirmation (e.g. how to delete associated resources).
   */
  readonly confirm?: () => Promise<ConfirmResult | undefined>;
  /**
   * The method to apply the delete, after it was confirmed by the user (if confirmation was requested).
   * @param confirmResult The truthy value returned by confirm(), or undefined if there was no confirm method or if
   *    the user skipped the confirmation with Ctrl+Alt or Ctrl+Shift.
   */
  readonly delete?: (confirmResult: ConfirmResult | undefined) => Promise<void> | void;
}

export const DeleteButton = <ConfirmResult,>(allProps: DeleteButtonProps<ConfirmResult>) => {
  const [props, buttonProps] = splitProps(allProps, ["label", "confirm", "delete"]);
  const t = useLangFunc();
  const [isDeleting, setIsDeleting] = createSignal(false);
  async function onClick(e: MouseEvent) {
    if (!props.delete) {
      return;
    }
    let confirmResult: ConfirmResult | undefined;
    const skipConfirmation = !props.confirm || (e.ctrlKey && (e.altKey || e.shiftKey));
    if (skipConfirmation) {
      confirmResult = undefined;
    } else {
      confirmResult = await props.confirm();
      if (!confirmResult) {
        return;
      }
    }
    setIsDeleting(true);
    try {
      await props.delete(confirmResult);
    } finally {
      setIsDeleting(false);
    }
  }
  return (
    <Button onClick={onClick} {...buttonProps} disabled={buttonProps.disabled || isDeleting()}>
      <Show when={isDeleting()}>
        <SmallSpinner />
      </Show>{" "}
      <actionIcons.Delete class="inlineIcon" /> {props.label === undefined ? t("actions.delete") : props.label}
    </Button>
  );
};
