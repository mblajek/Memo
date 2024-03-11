/**
 * Key used to wrap primitive values in form values where necessary.
 *
 * It is necessary mostly in arrays, as Felte requires the arrays to contain objects, and not primitive types.
 * In this case the primitive `value` is replaced with `{[WRAPPED_FIELD_KEY]: value}`.
 *
 * See https://felte.dev/docs/solid/field-arrays
 */
export const WRAPPED_FIELD_KEY = "__wrapped_value";

/** Unwraps the values at every level of the form values. */
export function recursiveUnwrapFormValues(formValues: unknown): unknown {
  if (Array.isArray(formValues)) {
    return formValues.map(recursiveUnwrapFormValues);
  } else if (formValues && typeof formValues === "object") {
    if (WRAPPED_FIELD_KEY in formValues) {
      return formValues[WRAPPED_FIELD_KEY];
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(formValues)) {
      result[key] = recursiveUnwrapFormValues(value);
    }
    return result;
  } else {
    return formValues;
  }
}

/** Returns an array with each element wrapped, unless already done. */
export function wrapArrayOfPrimitiveValues(values: unknown[]) {
  return values.every((value) => value && typeof value === "object" && Object.hasOwn(value, WRAPPED_FIELD_KEY))
    ? values
    : values.map((value) => ({[WRAPPED_FIELD_KEY]: value}));
}
