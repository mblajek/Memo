import {ValidationMessage} from "@felte/reporter-solid";
import {useFormContext} from "components/felte-form";
import {cx} from "components/utils";
import {Component, Index} from "solid-js";
import {HideableSection} from "../HideableSection";

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
  const hasErrors = () => !!(form.errors()[props.fieldName] || form.warnings()[props.fieldName]);
  return (
    <HideableSection show={hasErrors()}>
      <MessagesForLevel level="error" cssClass="text-red-400" />
      <MessagesForLevel level="warning" cssClass="text-yellow-300" />
    </HideableSection>
  );
};
