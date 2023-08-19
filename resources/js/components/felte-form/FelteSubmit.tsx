import {Button, ButtonProps} from "components/ui";
import {ParentComponent} from "solid-js";
import {useFormContext} from "./FelteForm";

/**
 * Custom submit button that works with FelteForm
 *
 * Must be used inside of FelteForm
 */
export const FelteSubmit: ParentComponent<ButtonProps> = (props) => {
  const {
    props: formProps,
    form,
    translations: {getSubmitText},
  } = useFormContext();
  return (
    <Button
      type="submit"
      form={formProps.id}
      class="bg-cyan-500 disabled:bg-opacity-50 p-2 text-white"
      disabled={form.isSubmitting() || props.disabled}
      {...props}
    >
      {props.children || getSubmitText()}
    </Button>
  );
};
