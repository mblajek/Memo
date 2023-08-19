import {ValidationMessage} from "@felte/reporter-solid";
import {Component, Index} from "solid-js";

interface Props {
  fieldName: string;
}

export const ValidationMessages: Component<Props> = (props) => (
  <>
    <ValidationMessage
      level="error"
      for={props.fieldName}
      as="ul"
      aria-live="polite"
      class="text-red-400 text-sm list-disc pl-6 mt-0.5"
    >
      {(messages) => <Index each={messages || []}>{(message) => <li>{message()}</li>}</Index>}
    </ValidationMessage>
    <ValidationMessage
      level="warning"
      for={props.fieldName}
      as="ul"
      aria-live="polite"
      class="text-yellow-300 text-sm list-disc pl-6 mt-0.5"
    >
      {(messages) => <Index each={messages || []}>{(message) => <li>{message()}</li>}</Index>}
    </ValidationMessage>
  </>
);
