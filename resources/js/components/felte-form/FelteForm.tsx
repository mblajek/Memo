import {Form, FormConfigWithoutTransformFn, KnownHelpers, Obj, Paths} from "@felte/core";
import {reporter} from "@felte/reporter-solid";
import {createForm} from "@felte/solid";
import {type KnownStores} from "@felte/solid/dist/esm/create-accessor";
import {validator} from "@felte/validator-zod";
import {isAxiosError} from "axios";
import {Api} from "data-access/memo-api/types";
import {Context, JSX, createContext, splitProps, useContext} from "solid-js";
import toast from "solid-toast";
import {ZodSchema} from "zod";
import {useLangFunc} from "../utils";

type FormContextValue<T extends Obj = Obj> = {
  props: FormProps<T>;
  form: FormType<T>;
  translations: Translations;
};

type FormType<T extends Obj = Obj> = Form<T> & KnownHelpers<T, Paths<T>> & KnownStores<T>;

/** User strings for parts of the form. */
type Translations = {
  getFormName: () => string;
  getFieldName: (field: string) => string;
  getSubmitText: () => string;
};

const FormContext = createContext<FormContextValue>(undefined, {
  name: "FormContext",
});

const typedFormContext = <T extends Obj>() => FormContext as Context<FormContextValue<T> | undefined>;

type FormProps<T extends Obj = Obj> = Omit<JSX.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onError"> &
  FormConfigWithoutTransformFn<T> & {
    /** The id of the form element. It is also used as a translation key prefix. */
    id: string;
    schema: ZodSchema<T>;
  };

/**
 * Wrapper for felte's `createForm`
 *
 * Includes solidjs' Provider, that stores
 * createForm's data and component props
 */
export const FelteForm = <T extends Obj = Obj>(props: FormProps<T>) => {
  const t = useLangFunc();
  const [local, createFormOptions, formProps] = splitProps(
    props,
    ["children", "schema"],
    ["debounced", "extend", "initialValues", "onError", "onSubmit", "onSuccess", "transform", "validate", "warn"],
  );
  const translations: Translations = {
    getFormName: () => t(`forms.${props.id}.name`),
    getFieldName: (field: string) => t(`forms.${props.id}.fields.${field}`),
    getSubmitText: () => t(`forms.${props.id}.submit`),
  };
  const form = createForm<T>({
    ...createFormOptions,
    extend: [validator({schema: local.schema}), reporter],
    onError: (error, ctx) => {
      createFormOptions?.onError?.(error, ctx);
      if (isAxiosError<Api.ErrorResponse>(error)) {
        error.response?.data.errors.forEach((error) => {
          if (Api.isValidationError(error)) {
            const errorMessage = t(error.code, {
              attribute: translations.getFieldName(error.field),
              ...error.data,
              ...(typeof error.data?.other === "string"
                ? {other: translations.getFieldName(error.data.other)}
                : undefined),
            });
            // @ts-expect-error setErrors does not like generic types
            ctx.setErrors(error.field, errorMessage);
          } else {
            toast.error(t(error.code));
          }
        });
      }
    },
  });

  const TypedFormContext = typedFormContext<T>();
  return (
    <TypedFormContext.Provider value={{props, form: form as FormType<T>, translations}}>
      <form ref={form.form} inert={form.isSubmitting() || undefined} {...formProps}>
        <fieldset class="contents" disabled={form.isSubmitting()}>
          {local.children}
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
