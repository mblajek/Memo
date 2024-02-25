import * as popover from "@zag-js/popover";
import {Accessor, ParentComponent, Show, splitProps} from "solid-js";
import {Button} from "../ui/Button";
import {SmallSpinner} from "../ui/Spinner";
import {SplitButton} from "../ui/SplitButton";
import {ChildrenOrFunc} from "../ui/children_func";
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
  /** Pop-over to show under the submit button's arrow. The submit button is a split button if specified. */
  readonly splitSubmitPopOver?: ChildrenOrFunc<[Accessor<popover.Api>]>;
}

/**
 * Custom submit button that works with FelteForm
 *
 * Must be used inside of FelteForm
 */
export const FelteSubmit: ParentComponent<Props> = (allProps) => {
  const {props: formProps, form, translations} = useFormContext();
  const [props, buttonProps] = splitProps(allProps, [
    "cancel",
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
      <div class="flex gap-1 justify-center items-stretch">
        <Show when={props.cancel}>
          <Button class="flex-grow basis-0 secondary" disabled={form.isSubmitting()} onClick={props.cancel}>
            {t("actions.cancel")}
          </Button>
        </Show>
        <div class="flex-grow basis-0">
          <SplitButton
            type="submit"
            form={formProps.id}
            class="w-full primary"
            disabled={form.isSubmitting() || buttonProps.disabled}
            {...buttonProps}
            popOver={props.splitSubmitPopOver}
          >
            <Show when={form.isSubmitting()}>
              <SmallSpinner />
            </Show>{" "}
            {props.children || translations.submit()}
          </SplitButton>
        </div>
      </div>
    </div>
  );
};
