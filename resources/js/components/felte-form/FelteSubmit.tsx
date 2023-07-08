import cx from "classnames";
import { Button, ButtonProps } from "components/ui";
import { ParentComponent, mergeProps } from "solid-js";
import { useFormContext } from "./FelteForm";

/**
 * Custom submit button that works with FelteForm
 *
 * Must be used inside of FelteForm
 */
export const FelteSubmit: ParentComponent<ButtonProps> = (props) => {
  const { form } = useFormContext();

  const merged = mergeProps<ButtonProps[]>({ type: "submit" }, props);

  return (
    <Button
      {...merged}
      class={cx(
        "bg-cyan-500 p-2 text-white",
        "disabled:bg-cyan-600 disabled:cursor-not-allowed",
        merged.class
      )}
      disabled={form.isSubmitting() || merged.disabled}
    />
  );
};
