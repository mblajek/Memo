import {htmlAttributes, useLangFunc} from "components/utils";
import {createSignal, JSX, ParentComponent, Show, splitProps, VoidComponent} from "solid-js";
import {SmallSpinner} from "./Spinner";
import {ACTION_ICONS} from "./icons";
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
      <ACTION_ICONS.edit class="inlineIcon strokeIcon text-current" />{" "}
      {props.label === undefined ? t("actions.edit") : props.label}
    </Button>
  );
};

interface DeleteButtonProps extends ButtonProps {
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
