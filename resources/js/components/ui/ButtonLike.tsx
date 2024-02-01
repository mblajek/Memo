import {ParentComponent} from "solid-js";
import {htmlAttributes} from "../utils";

interface Props extends htmlAttributes.div {
  readonly disabled?: boolean;
}

/**
 * A div acting like a button. This component:
 * - sets role="button", which also allows styling as primary/secondary
 * - sets tabindex
 * - and makes sure the button is pressable by keyboard
 * - sets aria-disabled and inert when disabled
 *
 * This component does not apply any visual styling.
 *
 * This component is intended for some specific situations where a button would not work, e.g. inside a
 * fieldset that is disabled.
 */
export const ButtonLike: ParentComponent<Props> = (props) => {
  return (
    <div
      {...props}
      role="button"
      aria-disabled={props.disabled}
      tabindex="0"
      inert={props.disabled || undefined}
      onPointerDown={(e) => e.currentTarget.click()}
      onKeyPress={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.click();
        } else {
          htmlAttributes.callHandler(props.onKeyPress, e);
        }
      }}
    />
  );
};
