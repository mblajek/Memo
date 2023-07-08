import cx from "classnames";
import { Button, ButtonProps } from "components/ui";
import { ParentComponent } from "solid-js";
import { useFormContext } from "./FelteForm";

/**
 * Custom submit button that works with FelteForm
 *
 * Must be used inside of FelteForm
 */
export const FelteSubmit: ParentComponent<ButtonProps> = (props) => {
  const { form } = useFormContext();
  return (
    <Button
      type="submit"
      {...props}
      class={cx(
        "bg-cyan-500 p-2 text-white",
        "disabled:bg-cyan-600 disabled:cursor-not-allowed",
        props.class
      )}
      disabled={form.isSubmitting() || props.disabled}
    >
      {props.children}
    </Button>
  );
};
