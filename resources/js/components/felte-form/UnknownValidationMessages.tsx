import {VoidComponent} from "solid-js";
import {ValidationMessages} from "./ValidationMessages";

/**
 * The name of a special unknown validation field. Validation errors that cannot be assigned to
 * any field form are assigned to this field, and displayed with the UnknownValidationMessages
 * component.
 */
export const UNKNOWN_VALIDATION_MESSAGES_FIELD = "__other";

/**
 * A component displaying validation messages that did not get assigned to any of the
 * existing form fields when they were received from the backend. Any such errors are instead
 * assigned to the field named by {@link UNKNOWN_VALIDATION_MESSAGES_FIELD}, and displayed
 * in this component.
 */
export const UnknownValidationMessages: VoidComponent = () => (
  <>
    <input class="hidden" name={UNKNOWN_VALIDATION_MESSAGES_FIELD} />
    <ValidationMessages fieldName={UNKNOWN_VALIDATION_MESSAGES_FIELD} />
  </>
);
