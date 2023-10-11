import {Form, FormConfigWithoutTransformFn, KnownHelpers, Obj, Paths} from "@felte/core";
import {reporter} from "@felte/reporter-solid";
import {createForm} from "@felte/solid";
import {type KnownStores} from "@felte/solid/dist/esm/create-accessor";
import {validator} from "@felte/validator-zod";
import {isAxiosError} from "axios";
import {Api} from "data-access/memo-api/types";
import {Context, JSX, createComputed, createContext, splitProps, useContext} from "solid-js";
import {ZodSchema} from "zod";
import {ChildrenOrFunc, getChildrenElement} from "../ui/children_func";
import {LangEntryFunc, LangPrefixFunc, createTranslationsFromPrefix, htmlAttributes, useLangFunc} from "../utils";
import {UNKNOWN_VALIDATION_MESSAGES_FIELD} from "./UnknownValidationMessages";

type FormContextValue<T extends Obj = Obj> = {
  props: FormProps<T>;
  form: FormType<T>;
  translations: FormTranslations;
};

export type FormType<T extends Obj = Obj> = Form<T> & KnownHelpers<T, Paths<T>> & KnownStores<T>;

/** User strings for parts of the form. */
export interface FormTranslations {
  formName: LangEntryFunc;
  fieldNames: LangPrefixFunc;
  submit: LangEntryFunc;
}

const FormContext = createContext<FormContextValue>(undefined, {
  name: "FormContext",
});

const typedFormContext = <T extends Obj>() => FormContext as Context<FormContextValue<T> | undefined>;

type FormProps<T extends Obj = Obj> = Omit<htmlAttributes.form, "onSubmit" | "onError" | "children"> &
  FormConfigWithoutTransformFn<T> & {
    /** The id of the form element. It is also used as a translation key prefix. */
    id: string;
    schema: ZodSchema<T>;
    children: ChildrenOrFunc<[FormType<T>]>;
    onFormCreated?: (form: FormType<T>) => void;
  };

/**
 * Wrapper for felte's `createForm`.
 *
 * Includes solidjs' Provider, that stores createForm's data and component props.
 *
 * The form is also accessible via children: children can be a function taking a Felte form object
 * and returning JSX, similar to the function form of the `<Show>` component.
 */
export const FelteForm = <T extends Obj = Obj>(props: FormProps<T>): JSX.Element => {
  const t = useLangFunc();
  const [local, createFormOptions, formProps] = splitProps(
    props,
    ["children", "schema", "onFormCreated"],
    ["debounced", "extend", "initialValues", "onError", "onSubmit", "onSuccess", "transform", "validate", "warn"],
  );
  // eslint-disable-next-line solid/reactivity
  const translations = createTranslationsFromPrefix(`forms.${props.id}`, ["formName", "fieldNames", "submit"]);
  const form = createForm<T>({
    ...createFormOptions,
    extend: [validator({schema: local.schema}), reporter],
    onSubmit: (values, ctx) =>
      // Remove the unknown validation field from values so that it doesn't get submitted.
      createFormOptions.onSubmit?.({...values, [UNKNOWN_VALIDATION_MESSAGES_FIELD]: undefined}, ctx),
    onError: (error, ctx) => {
      createFormOptions.onError?.(error, ctx);
      if (isAxiosError<Api.ErrorResponse>(error)) {
        error.response?.data.errors.forEach((error) => {
          if (Api.isValidationError(error)) {
            // For existing fields, the error is either an array, or null.
            const formFieldExists = form.errors(error.field) !== undefined;
            let errorMessage: string;
            let field: string;
            if (formFieldExists) {
              errorMessage = t(error.code, {
                attribute: translations.fieldNames(error.field),
                ...error.data,
                ...(typeof error.data?.other === "string"
                  ? {other: translations.fieldNames(error.data.other, {defaultValue: error.data.other})}
                  : undefined),
              });
              field = error.field;
            } else {
              // The error was received for a field that does not exist directly in the form. Don't do
              // all the magic with the error message, and assign the error to the special unknown validation field.
              errorMessage = t(error.code, {
                attribute: translations.fieldNames(error.field, {defaultValue: error.field}),
                ...error.data,
              });
              field = UNKNOWN_VALIDATION_MESSAGES_FIELD;
            }
            // @ts-expect-error setErrors does not like generic types
            ctx.setErrors(field, (errors) => [...errors, errorMessage]);
          }
          // Other errors are already handled by the query client.
        });
      }
    },
  }) as FormType<T>;

  // eslint-disable-next-line solid/reactivity
  local.onFormCreated?.(form);

  const TypedFormContext = typedFormContext<T>();
  return (
    <TypedFormContext.Provider value={{props, form: form as FormType<T>, translations}}>
      <form autocomplete="off" ref={form.form} {...formProps}>
        <fieldset class="contents" disabled={form.isSubmitting()} inert={form.isSubmitting() || undefined}>
          {getChildrenElement(local.children, form)}
        </fieldset>
      </form>
    </TypedFormContext.Provider>
  );
};

/**
 * Generic form context getter. When type is passed, context is properly typed.
 *
 * Usefull in forms with deeply nested components and dependant logic
 */
export const useFormContext = <T extends Obj = Obj>() => {
  const context = useFormContextIfInForm<T>();
  if (!context) throw new Error("Not in FelteForm");
  return context;
};

/**
 * A version of useFormContext that returns undefined when not in form. Useful in field components
 * that can be used both in form and separately.
 */
export const useFormContextIfInForm = <T extends Obj = Obj>() => {
  return useContext(typedFormContext<T>());
};
