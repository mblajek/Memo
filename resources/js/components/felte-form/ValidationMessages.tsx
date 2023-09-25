import {ValidationMessage} from "@felte/reporter-solid";
import {useFormContext} from "components/felte-form";
import {cx} from "components/utils";
import {Component, Index, createMemo, on} from "solid-js";
import {HideableSection} from "../ui/HideableSection";

interface Props {
  fieldName: string;
}

export const ValidationMessages: Component<Props> = (props) => {
  const MessagesForLevel: Component<{level: "error" | "warning"; cssClass: string}> = (pp) => (
    <ValidationMessage
      level={pp.level}
      for={props.fieldName}
      as="ul"
      aria-live="polite"
      class={cx("text-sm list-disc pl-6", pp.cssClass)}
    >
      {(messages) => <Index each={messages || []}>{(message) => <li>{message()}</li>}</Index>}
    </ValidationMessage>
  );
  const {form} = useFormContext();
  const hasErrors = createMemo(
    // For some reason, the "on" part is required for reaction to errors and warnings change.
    // Depending directly on form.errors(props.fieldName) does not work reliably for some fields.
    on(
      [() => props.fieldName, form.errors, form.warnings],
      ([fieldName]) => !!(fieldName && (form.errors(fieldName) || form.warnings(fieldName))),
    ),
  );
  return (
    <HideableSection show={hasErrors()}>
      <MessagesForLevel level="error" cssClass="text-red-400" />
      <MessagesForLevel level="warning" cssClass="text-yellow-300" />
    </HideableSection>
  );
};
