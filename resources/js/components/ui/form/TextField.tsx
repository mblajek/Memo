import { ValidationMessage } from "@felte/reporter-solid";
import { cx } from "components/utils";
import { Component, Index, JSX } from "solid-js";

export interface TextFieldProps
  extends JSX.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  label: string;
}

/**
 * Wrapper of native HTML's `<input>`
 *
 * Intended for use with FelteForm (handles validation messages)
 */
export const TextField: Component<TextFieldProps> = (props) => {
  return (
    <div>
      <label for={props.name}>{props.label}</label>
      <input
        {...props}
        class={cx(
          "w-full border border-gray-400 rounded-sm p-2",
          "aria-invalid:border-red-400",
          props.class,
        )}
      />
      <ValidationMessage
        level="error"
        for={props.name}
        as="ul"
        aria-live="polite"
        class="text-red-400 text-sm list-disc list-inside mt-0.5"
      >
        {(messages) => (
          <Index each={messages || []}>
            {(message) => <li>{message()}</li>}
          </Index>
        )}
      </ValidationMessage>
      <ValidationMessage
        level="warning"
        for={props.name}
        as="ul"
        aria-live="polite"
        class="text-yellow-300 text-sm list-disc list-inside mt-0.5"
      >
        {(messages) => (
          <Index each={messages || []}>
            {(message) => <li>{message()}</li>}
          </Index>
        )}
      </ValidationMessage>
    </div>
  );
};
