import {Button} from "components/ui";
import {ParentComponent, Show, splitProps} from "solid-js";
import {htmlAttributes, useLangFunc} from "../utils";
import {useFormContext} from "./FelteForm";
import {UnknownValidationMessages} from "./UnknownValidationMessages";

interface Props extends htmlAttributes.button {
  /**
   * The cancel handler. If present, there will be a cancel button to the right of the submit button.
   * The value is the handler called on cancel click. Default: no cancel.
   */
  cancel?: () => void;
  /** Whether to include the unknown validation messages above the button. Default: true. */
  includeUnknownValidationMessages?: boolean;
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
          <Button
            class="flex-grow basis-0 secondary"
            disabled={form.isSubmitting() || buttonProps.disabled}
            onClick={props.cancel}
          >
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
          {props.children || translations.submit()}
        </Button>
      </div>
    </div>
  );
};
