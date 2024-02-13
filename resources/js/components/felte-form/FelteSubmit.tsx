import {ParentComponent, Show, splitProps} from "solid-js";
import {Button} from "../ui/Button";
import {SmallSpinner} from "../ui/Spinner";
import {htmlAttributes, useLangFunc} from "../utils";
import {useFormContext} from "./FelteForm";
import {UnknownValidationMessages} from "./UnknownValidationMessages";

interface Props extends htmlAttributes.button {
  /**
   * The cancel handler. If present, there will be a cancel button to the right of the submit button.
   * The value is the handler called on cancel click. Default: no cancel.
   */
  readonly cancel?: () => void;
  /** Whether to include the unknown validation messages above the button. Default: true. */
  readonly includeUnknownValidationMessages?: boolean;
}

/**
 * Custom submit button that works with FelteForm
 *
 * Must be used inside of FelteForm
 */
export const FelteSubmit: ParentComponent<Props> = (allProps) => {
  const {props: formProps, form, translations} = useFormContext();
  const [props, buttonProps] = splitProps(allProps, ["cancel", "includeUnknownValidationMessages", "children"]);
  const t = useLangFunc();
  return (
    <div class="flex flex-col items-stretch">
      <Show when={props.includeUnknownValidationMessages ?? true}>
        <UnknownValidationMessages />
      </Show>
      <div class="flex gap-1 justify-center items-stretch">
        <Show when={props.cancel}>
          <Button class="flex-grow basis-0 secondary" disabled={form.isSubmitting()} onClick={props.cancel}>
            {t("actions.cancel")}
          </Button>
        </Show>
        <Button
          type="submit"
          form={formProps.id}
          class="flex-grow basis-0 primary"
          disabled={form.isSubmitting() || buttonProps.disabled}
          {...buttonProps}
        >
          <Show when={form.isSubmitting()}>
            <SmallSpinner />
          </Show>{" "}
          {props.children || translations.submit()}
        </Button>
      </div>
    </div>
  );
};
