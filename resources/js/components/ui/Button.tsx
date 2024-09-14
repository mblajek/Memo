import {htmlAttributes, useLangFunc} from "components/utils";
import {createSignal, JSX, ParentComponent, Show, splitProps, VoidComponent} from "solid-js";
import {SmallSpinner} from "./Spinner";
import {actionIcons} from "./icons";
import {mergeTitleDirectiveProps, title, TitleDirectiveType} from "./title";

const _DIRECTIVES_ = () => title;

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

interface BaseProps<ConfirmResult> extends ButtonProps {
  readonly icon?: JSX.Element;
  readonly label?: JSX.Element;
  /**
   * The method to apply the delete, after it was confirmed by the user (if confirmation was requested and not overridden).
   * The confirmResult is the truthy value returned by confirm() or ctrlAltOverride if clicked with Ctrl+Alt (or Ctrl+Shift).
   */
  readonly delete?: (confirmResult: ConfirmResult) => Promise<void> | void;
}

interface NoConfirmProps extends BaseProps<boolean> {
  readonly confirm?: undefined;
  readonly ctrlAltOverride?: undefined;
}

interface ConfirmProps<ConfirmResult> extends BaseProps<ConfirmResult> {
  /**
   * The method to confirm delete with the user, typically via a dialog from confirmation.tsx.
   * If not provided, the delete function is called without confirmation.
   * The delete is considered confirmed, i.e. delete() is called, if confirm() resolves to a truthy value. That value is
   * just 'true' in a simple yes/no confirmation, but it can also be an object passing additional user choices from the
   * confirmation (e.g. how to delete associated resources).
   */
  readonly confirm?: () => Promise<ConfirmResult | undefined>;
  /**
   * If clicked with Ctrl+Alt (or Ctrl+Shift), this is the value to pass to delete() instead of calling confirm.
   * Must be truthy to allow overriding.
   * Default: falsy (no confirmation overriding possible).
   */
  readonly ctrlAltOverride?: ConfirmResult;
}

type Props<ConfirmResult> = NoConfirmProps | ConfirmProps<ConfirmResult>;

export const DeleteButton = <ConfirmResult,>(allProps: Props<ConfirmResult>) => {
  const [props, buttonProps] = splitProps(allProps, ["icon", "label", "confirm", "ctrlAltOverride", "delete"]);
  const t = useLangFunc();
  const [isDeleting, setIsDeleting] = createSignal(false);
  async function onClick(e: MouseEvent) {
    if (!props.delete) {
      return;
    }
    let confirmResult: ConfirmResult | undefined;
    if (!props.confirm) {
      confirmResult = true as ConfirmResult;
    } else if (e.ctrlKey && (e.altKey || e.shiftKey)) {
      confirmResult = props.ctrlAltOverride;
    } else {
      confirmResult = await props.confirm();
    }
    if (confirmResult) {
      setIsDeleting(true);
      try {
        await (props as ConfirmProps<ConfirmResult>).delete!(confirmResult);
      } finally {
        setIsDeleting(false);
      }
    }
  }
  return (
    <Button onClick={onClick} {...buttonProps} disabled={buttonProps.disabled || isDeleting()}>
      <Show when={isDeleting()}>
        <SmallSpinner />
      </Show>{" "}
      {props.icon ?? <actionIcons.Delete class="inlineIcon" />} {props.label ?? t("actions.delete")}
    </Button>
  );
};
