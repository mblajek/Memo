import {
  AssignableErrors,
  Form,
  FormConfigWithoutTransformFn,
  KnownHelpers,
  Obj,
  Paths,
  SubmitContext,
  Touched,
} from "@felte/core";
import {reporter} from "@felte/reporter-solid";
import {createForm} from "@felte/solid";
import {type KnownStores} from "@felte/solid/dist/esm/create-accessor";
import {validator} from "@felte/validator-zod";
import {BeforeLeaveEventArgs, useBeforeLeave} from "@solidjs/router";
import {isAxiosError} from "axios";
import {Api} from "data-access/memo-api/types";
import {TOptions} from "i18next";
import {Context, JSX, createContext, createMemo, onMount, splitProps, useContext} from "solid-js";
import {ZodSchema} from "zod";
import {LoadingPane} from "../ui/LoadingPane";
import {ChildrenOrFunc, getChildrenElement} from "../ui/children_func";
import {createFormLeaveConfirmation} from "../ui/form/form_leave_confirmation";
import {NON_NULLABLE, htmlAttributes, useLangFunc} from "../utils";
import {useEventListener} from "../utils/event_listener";
import {useMutationsTracker} from "../utils/mutations_tracker";
import {toastError} from "../utils/toast";
import {UNKNOWN_VALIDATION_MESSAGES_FIELD} from "./UnknownValidationMessages";
import {recursiveUnwrapFormValues} from "./wrapped_fields";

export interface FormContextValue<T extends Obj = Obj> {
  readonly props: FormProps<T>;
  readonly formConfig: FormConfigWithoutTransformFn<T>;
  readonly form: FormType<T>;
  isFormDisabled(): boolean;
  readonly translations: FormTranslations;
}

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

export type FormProps<T extends Obj = Obj> = Omit<htmlAttributes.form, "onSubmit" | "onError" | "children"> &
  FormConfigWithoutTransformFn<T> & {
    /** The id of the form element. It is also used as a translation key prefix. */
    readonly id: string;
    readonly schema: ZodSchema<T>;
    /** The form names used to resolve translations. Defaults to the id. */
    readonly translationsFormNames?: readonly string[];
    /** The name of the model of the object edited by this form. It is used for getting field translations. */
    readonly translationsModel?: string | readonly string[];
    readonly children: ChildrenOrFunc<[FormType<T>, FormContextValue<T>]>;
    readonly disabled?: boolean;
    /**
     * The submit handler. It can return the onSuccess function that notifies about a successful submission.
     * The notification (e.g. navigation, modal close etc) should not be done from the onSubmit directly because
     * the form is still in submitting state at that time.
     */
    readonly onSubmit?: (values: T, context: SubmitContext<T>) => Promise<() => void | Promise<void>> | unknown;
    readonly onFormCreated?: (form: FormType<T>) => void;
    /** Whether closing the browser tab should display a warning if the form is dirty. Default: true. */
    readonly preventPageLeave?: boolean;
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
  const [props, createFormOptions, formProps] = splitProps(
    allProps,
    [
      "children",
      "schema",
      "translationsFormNames",
      "translationsModel",
      "disabled",
      "onFormCreated",
      "preventPageLeave",
    ],
    ["debounced", "extend", "initialValues", "onError", "onSubmit", "onSuccess", "transform", "validate", "warn"],
  );
  const t = useLangFunc();
  const confirmation = createFormLeaveConfirmation();
  const mutationsTracking = useMutationsTracker();
  const translationsFormNames = createMemo(() => [...(props.translationsFormNames || [allProps.id]), "generic"]);
  const translationsModels = createMemo(() =>
    Array.isArray(props.translationsModel) ? props.translationsModel || [] : [props.translationsModel],
  );
  const translations: FormTranslations = {
    formName: (o) =>
      t(
        translationsFormNames().map((f) => `forms.${f}.form_name`),
        o,
      ),
    fieldName: (field, o) =>
      t(
        [
          ...translationsFormNames().map((f) => `forms.${f}.field_names.${field}`),
          ...translationsModels().map((m) => `models.${m}.${field}`),
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
  const formConfig: FormConfigWithoutTransformFn<T> = {
    ...createFormOptions,
    // eslint-disable-next-line solid/reactivity
    extend: [validator({schema: props.schema}), reporter],
    onSubmit: async (values, ctx) => {
      // Remove the unknown validation field from values so that it doesn't get submitted.
      const result = await createFormOptions.onSubmit?.(
        {
          // Cast the type. It is not true but it is a hack we use to allow the form manipulate the transformed data.
          ...(recursiveUnwrapFormValues(values) as T),
          [UNKNOWN_VALIDATION_MESSAGES_FIELD]: undefined,
        },
        ctx,
      );
      // Submit success, so make the form pristine.
      form.setIsDirty(false);
      form.setIsSubmitting(false);
      return result;
    },
    onSuccess: async (response, ctx) => {
      if (typeof response === "function") {
        await response();
      }
      await createFormOptions.onSuccess?.(response, ctx);
    },
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
                ...(Array.isArray(error.data?.values)
                  ? {values: error.data.values.map((v) => (typeof v === "string" ? getQuotedFieldName(v) : v))}
                  : undefined),
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function setTouched(touched: Readonly<Touched<any>>): Touched<any> {
              if (!touched) {
                return true;
              }
              if (Array.isArray(touched)) {
                if (touched.length) {
                  return [setTouched(touched[0]), ...touched.slice(1)];
                } else {
                  return [true];
                }
              }
              // The field has sub-fields apparently. Attach the error to one of them.
              const anySubField = Object.keys(touched)[0];
              if (!anySubField) {
                return true;
              }
              return {
                ...touched,
                [anySubField]: setTouched(touched[anySubField]),
              };
            }
            // Mark as touched first because errors are only stored and shown for touched fields.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ctx.setTouched(field, (touched: Touched<any>) => setTouched(touched));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function addError(errors: Readonly<AssignableErrors<any>>, errorMessage: string): AssignableErrors<any> {
              if (!errors) {
                return [errorMessage];
              }
              if (Array.isArray(errors)) {
                return [...errors, errorMessage];
              }
              // The field has sub-fields apparently. Attach the error to one of them.
              const anySubField = Object.keys(errors)[0];
              if (!anySubField) {
                return [errorMessage];
              }
              return {
                ...errors,
                [anySubField]: addError(errors[anySubField], errorMessage),
              };
            }
            // @ts-expect-error setErrors does not like generic types
            ctx.setErrors(field, (errors) => addError(errors, errorMessage));
          }
          // Other errors are already handled by the query client.
        }
      } else {
        console.error("Form error:", errorResp, ctx);
        if (!(errorResp instanceof Error)) {
          errorResp = new Error(`Form error: ${JSON.stringify(errorResp)}`);
        }
        toastError(t("exception.form_submit"));
        throw errorResp;
      }
    },
  };
  const form = createForm<T>(formConfig) as FormType<T>;

  onMount(() => {
    function shouldConfirmPageLeave(e: BeforeUnloadEvent | BeforeLeaveEventArgs) {
      return (props.preventPageLeave ?? true) && !e.defaultPrevented && (form.isDirty() || form.isSubmitting());
    }
    useEventListener(window, "beforeunload", (e) => {
      if (shouldConfirmPageLeave(e)) {
        e.preventDefault();
      }
    });
    useBeforeLeave(async (e) => {
      if (shouldConfirmPageLeave(e)) {
        e.preventDefault();
        if (await confirmation.confirm()) {
          e.retry(true);
        }
      }
    });
  });

  const formDisabled = () => props.disabled || form.isSubmitting();

  // eslint-disable-next-line solid/reactivity
  props.onFormCreated?.(form);

  const TypedFormContext = typedFormContext<T>();
  const contextValue = {
    props: allProps,
    formConfig,
    form: form as FormType<T>,
    isFormDisabled: () => formDisabled(),
    translations,
  } satisfies FormContextValue<T>;
  return (
    <TypedFormContext.Provider value={contextValue}>
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
        {...htmlAttributes.merge(formProps, {class: "flex flex-col gap-1 relative"})}
      >
        <fieldset class="contents" disabled={formDisabled()} inert={form.isSubmitting() || undefined}>
          {getChildrenElement(props.children, form, contextValue)}
        </fieldset>
        <LoadingPane isLoading={form.isSubmitting() || mutationsTracking.isAnyPending()} />
      </form>
    </TypedFormContext.Provider>
  );
};

/**
 * Generic form context getter. When type is passed, context is properly typed.
 *
 * Useful in forms with deeply nested components and dependant logic.
 */
export const useFormContext = <T extends Obj = Obj>() => {
  const context = useFormContextIfInForm<T>();
  if (!context) {
    throw new Error("Not in FelteForm");
  }
  return context;
};

/**
 * A version of useFormContext that returns undefined when not in form. Useful in field components
 * that can be used both in form and separately.
 */
export const useFormContextIfInForm = <T extends Obj = Obj>() => {
  return useContext(typedFormContext<T>());
};
