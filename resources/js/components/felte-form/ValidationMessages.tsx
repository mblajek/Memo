import {ValidationMessage} from "@felte/reporter-solid";
import {useFormContextIfInForm} from "components/felte-form/FelteForm";
import {cx} from "components/utils";
import {Index, VoidComponent, createMemo, on} from "solid-js";
import {HideableSection} from "../ui/HideableSection";

interface Props {
  readonly fieldName: string;
}

export const ValidationMessages: VoidComponent<Props> = (props) => {
  const formContext = useFormContextIfInForm();
  if (!formContext) {
    // Being inside a form or not is not something that can change dynamically, so it's fine to return early.
    // eslint-disable-next-line solid/components-return-once
    return undefined;
  }
  const {form} = formContext;
  const MessagesForLevel: VoidComponent<{level: "error" | "warning"; cssClass: string}> = (pp) => (
    <ValidationMessage
      level={pp.level}
      for={props.fieldName}
      as="ul"
      aria-live="polite"
      class={cx("text-sm list-disc list-inside wrapTextAnywhere", pp.cssClass)}
    >
      {(messages: unknown) => {
        function flattenMessages(messages: unknown): string[] {
          // The messages are typed as string[], but if the name points to a nested object,
          // the messages are actually objects. This might be a bug in Felte.
          if (!messages) {
            return [];
          } else if (typeof messages === "string") {
            return [messages];
          } else if (Array.isArray(messages)) {
            return messages.flatMap(flattenMessages);
          } else if (typeof messages === "object") {
            return flattenMessages(Object.values(messages));
          } else {
            return [];
          }
        }
        return <Index each={flattenMessages(messages)}>{(message) => <li>{message()}</li>}</Index>;
      }}
    </ValidationMessage>
  );
  const hasErrors = createMemo(
    // For some reason, the "on" part is required for reaction to errors and warnings change.
    // Depending directly on form.errors(props.fieldName) does not work reliably for some fields.
    on(
      [() => props.fieldName, form.errors, form.warnings],
      ([fieldName]) =>
        !!fieldName &&
        !(isValidationMessageEmpty(form.errors(fieldName)) && isValidationMessageEmpty(form.warnings(fieldName))),
    ),
  );
  return (
    <HideableSection show={hasErrors()}>
      <MessagesForLevel level="error" cssClass="text-red-400" />
      <MessagesForLevel level="warning" cssClass="text-yellow-600" />
    </HideableSection>
  );
};

export function isValidationMessageEmpty(errorsOrWarnings: unknown): boolean {
  return (
    errorsOrWarnings == null ||
    (Array.isArray(errorsOrWarnings) && errorsOrWarnings.every(isValidationMessageEmpty)) ||
    (typeof errorsOrWarnings === "object" && Object.values(errorsOrWarnings).every(isValidationMessageEmpty))
  );
}
