import {Form, FormConfigWithoutTransformFn, KnownHelpers, Obj, Paths} from "@felte/core";
import {reporter} from "@felte/reporter-solid";
import {createForm} from "@felte/solid";
import {type KnownStores} from "@felte/solid/dist/esm/create-accessor";
import {validator} from "@felte/validator-zod";
import {BeforeLeaveEventArgs, useBeforeLeave} from "@solidjs/router";
import {isAxiosError} from "axios";
import {Api} from "data-access/memo-api/types";
import {TOptions} from "i18next";
import {Context, JSX, createContext, onCleanup, onMount, splitProps, useContext} from "solid-js";
import {ZodSchema} from "zod";
import {ChildrenOrFunc, getChildrenElement} from "../ui/children_func";
import {NON_NULLABLE, htmlAttributes, useLangFunc} from "../utils";
import {UNKNOWN_VALIDATION_MESSAGES_FIELD} from "./UnknownValidationMessages";

type FormContextValue<T extends Obj = Obj> = {
  readonly props: FormProps<T>;
  readonly form: FormType<T>;
  isFormDisabled(): boolean;
  readonly translations: FormTranslations;
};

export type FormType<T extends Obj = Obj> = Form<T> & KnownHelpers<T, Paths<T>> & KnownStores<T>;

/** User strings for parts of the form. */
export interface FormTranslations {
  formName(o?: TOptions): string;
  fieldName(field: string, o?: TOptions): string;
  submit(o?: TOptions): string;
}

const FormContext = createContext<FormContextValue>(undefined, {
  name: "FormContext",
});

const typedFormContext = <T extends Obj>() => FormContext as Context<FormContextValue<T> | undefined>;

type FormProps<T extends Obj = Obj> = Omit<htmlAttributes.form, "onSubmit" | "onError" | "children"> &
  FormConfigWithoutTransformFn<T> & {
    /** The id of the form element. It is also used as a translation key prefix. */
    readonly id: string;
    readonly schema: ZodSchema<T>;
    /** The form names used to resolve translations. Defaults to the id. */
    readonly translationsFormNames?: readonly string[];
    /** The name of the model of the object edited by this form. It is used for getting field translations. */
    readonly translationsModel?: string;
    readonly children: ChildrenOrFunc<[FormType<T>]>;
    readonly disabled?: boolean;
    readonly onFormCreated?: (form: FormType<T>) => void;
    /** Whether closing the browser tab should display a warning if the form is dirty. Default: true. */
    readonly preventTabClose?: boolean;
  };

/**
 * Wrapper for felte's `createForm`.
 *
 * Includes solidjs' Provider, that stores createForm's data and component props.
 *
 * The form is also accessible via children: children can be a function taking a Felte form object
 * and returning JSX, similar to the function form of the `<Show>` component.
 */
export const FelteForm = <T extends Obj = Obj>(allProps: FormProps<T>): JSX.Element => {
  const t = useLangFunc();
  const [props, createFormOptions, formProps] = splitProps(
    allProps,
    [
      "children",
      "schema",
      "translationsFormNames",
      "translationsModel",
      "disabled",
      "onFormCreated",
      "preventTabClose",
    ],
    ["debounced", "extend", "initialValues", "onError", "onSubmit", "onSuccess", "transform", "validate", "warn"],
  );
  const translationsFormNames = () => props.translationsFormNames || [allProps.id];
  const translations: FormTranslations = {
    formName: (o) =>
      t(
        translationsFormNames().map((f) => `forms.${f}.formName`),
        o,
      ),
    fieldName: (field, o) =>
      t(
        [
          ...translationsFormNames().map((f) => `forms.${f}.fieldNames.${field}`),
          props.translationsModel && `models.${props.translationsModel}.${field}`,
          `models.generic.${field}`,
        ].filter(NON_NULLABLE),
        o,
      ),
    submit: (o) =>
      t(
        translationsFormNames().map((f) => `forms.${f}.submit`),
        o,
      ),
  };
  function getQuotedFieldName(field: string, {skipIfMissing = false} = {}) {
    if (skipIfMissing) {
      const name = translations.fieldName(field, {defaultValue: ""});
      return name && t("validation.quoted_field_name", {text: name});
    } else {
      return t("validation.quoted_field_name", {text: translations.fieldName(field, {defaultValue: field})});
    }
  }
  const form = createForm<T>({
    ...createFormOptions,
    extend: [validator({schema: props.schema}), reporter],
    onSubmit: (values, ctx) =>
      // Remove the unknown validation field from values so that it doesn't get submitted.
      createFormOptions.onSubmit?.({...values, [UNKNOWN_VALIDATION_MESSAGES_FIELD]: undefined}, ctx),
    onError: (errorResp, ctx) => {
      createFormOptions.onError?.(errorResp, ctx);
      if (isAxiosError<Api.ErrorResponse>(errorResp) && errorResp.response) {
        for (const error of errorResp.response.data.errors) {
          if (Api.isValidationError(error)) {
            // For existing fields, the error is either an array, or null.
            const formFieldExists = form.errors(error.field) !== undefined;
            let errorMessage: string;
            let field: string;
            if (formFieldExists) {
              errorMessage = t(error.code, {
                attribute: getQuotedFieldName(error.field, {skipIfMissing: true}),
                ...error.data,
                ...(typeof error.data?.other === "string" ? {other: getQuotedFieldName(error.data.other)} : undefined),
                ...(typeof error.data?.member_type === "string"
                  ? {member_type: t(`validation.special_fields.member_type.${error.data.member_type}`)}
                  : undefined),
              });
              field = error.field;
            } else {
              // The error was received for a field that does not exist directly in the form. Don't do
              // all the magic with the error message, and assign the error to the special unknown validation field.
              errorMessage = t(error.code, {
                attribute: getQuotedFieldName(error.field),
                ...error.data,
              });
              field = UNKNOWN_VALIDATION_MESSAGES_FIELD;
            }
            // Mark as touched first because errors are only stored and shown for touched fields.
            // @ts-expect-error For some reason there are problems with the generic types.
            ctx.setTouched(field, true);
            // @ts-expect-error setErrors does not like generic types
            ctx.setErrors(field, (errors) => [...(errors || []), errorMessage]);
          }
          // Other errors are already handled by the query client.
        }
      }
    },
  }) as FormType<T>;

  onMount(() => {
    function onBeforeUnload(e: BeforeUnloadEvent | BeforeLeaveEventArgs) {
      if ((props.preventTabClose ?? true) && !e.defaultPrevented && (form.isDirty() || form.isSubmitting())) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    onCleanup(() => window.removeEventListener("beforeunload", onBeforeUnload));
    useBeforeLeave(onBeforeUnload);
  });

  const formDisabled = () => props.disabled || form.isSubmitting();

  // eslint-disable-next-line solid/reactivity
  props.onFormCreated?.(form);

  const TypedFormContext = typedFormContext<T>();
  return (
    <TypedFormContext.Provider
      value={{
        props: allProps,
        form: form as FormType<T>,
        isFormDisabled: () => formDisabled(),
        translations,
      }}
    >
      <form
        autocomplete="off"
        ref={(formElem) => {
          // Forward the form element to felte.
          form.form(formElem);
          // Focus the autofocus element (as it doesn't happen automatically).
          onMount(() => {
            const focusedElem = formElem.querySelector("[autofocus]");
            if (focusedElem instanceof HTMLElement) {
              focusedElem.focus();
            }
          });
        }}
        {...htmlAttributes.merge(formProps, {class: "flex flex-col gap-1"})}
      >
        <fieldset class="contents" disabled={formDisabled()} inert={form.isSubmitting() || undefined}>
          {getChildrenElement(props.children, form)}
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
