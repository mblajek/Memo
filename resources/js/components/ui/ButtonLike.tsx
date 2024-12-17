import {ParentComponent} from "solid-js";
import {cx, htmlAttributes} from "../utils";
import {ButtonProps} from "./Button";
import {mergeTitleDirectiveProps, title} from "./title";

type _Directives = typeof title;

interface Props extends Omit<htmlAttributes.div, "title"> {
  readonly disabled?: boolean;
  readonly title?: ButtonProps["title"];
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
      // TODO: Use htmlAttributes.merge, but fix it so that handlers are attached consistently.
      // This is a temporary solution.
      {...props}
      class={cx(props.class, "inline-block")}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      title=""
      role="button"
      tabindex="0"
      aria-disabled={props.disabled}
      bool:inert={props.disabled}
      use:title={mergeTitleDirectiveProps(props.title, {hideOnClick: true})}
    />
  );
};
