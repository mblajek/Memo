import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {JSX, Show, VoidComponent, splitProps} from "solid-js";
import {Button} from "../ui/Button";
import {PopOverControl} from "../ui/PopOver";
import {SmallSpinner} from "../ui/Spinner";
import {SplitButton} from "../ui/SplitButton";
import {ChildrenOrFunc} from "../ui/children_func";
import {useFormContext} from "./FelteForm";
import {UnknownValidationMessages} from "./UnknownValidationMessages";

interface Props extends htmlAttributes.button {
  /**
   * The cancel handler. If present, there will be a cancel button to the right of the submit button.
   * The value is the handler called on cancel click. Default: no cancel.
   */
  readonly cancel?: () => void;
  readonly submitLabel?: (defaultLabel: string) => JSX.Element;
  readonly cancelLabel?: JSX.Element;
  /** Whether to include the unknown validation messages above the button. Default: true. */
  readonly includeUnknownValidationMessages?: boolean;
  /** Pop-over to show under the submit button's arrow. The submit button is a split button if specified. */
  readonly splitSubmitPopOver?: ChildrenOrFunc<[PopOverControl]>;
}

/**
 * Custom submit button that works with FelteForm
 *
 * Must be used inside of FelteForm
 */
export const FelteSubmit: VoidComponent<Props> = (allProps) => {
  const {props: formProps, form, translations} = useFormContext();
  const [props, buttonProps] = splitProps(allProps, [
    "cancel",
    "submitLabel",
    "cancelLabel",
    "includeUnknownValidationMessages",
    "splitSubmitPopOver",
    "children",
  ]);
  const t = useLangFunc();
  return (
    <div class="flex flex-col items-stretch">
      <Show when={props.includeUnknownValidationMessages ?? true}>
        <UnknownValidationMessages />
      </Show>
      <div class="grid auto-cols-fr grid-flow-col gap-1">
        <Show when={props.cancel}>
          <Button class="secondary" disabled={form.isSubmitting()} onClick={props.cancel}>
            {props.cancelLabel || t("actions.cancel")}
          </Button>
        </Show>
        <SplitButton
          divClass=""
          type="submit"
          form={formProps.id}
          class="primary"
          disabled={form.isSubmitting() || buttonProps.disabled}
          {...buttonProps}
          popOver={props.splitSubmitPopOver}
        >
          <Show when={form.isSubmitting()}>
            <SmallSpinner />
          </Show>{" "}
          {props.submitLabel ? props.submitLabel(translations.submit()) : translations.submit()}
        </SplitButton>
      </div>
    </div>
  );
};
