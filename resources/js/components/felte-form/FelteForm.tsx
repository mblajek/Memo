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
  form: Form<T> & KnownHelpers<T, Paths<T>> & KnownStores<T>;
};

const FormContext = createContext(undefined, {
  name: "FormContext",
});

type FormProps<T extends Obj = Obj> = Omit<JSX.FormHTMLAttributes<HTMLFormElement>, "onSubmit" | "onError"> &
  FormConfigWithoutTransformFn<T> & {
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

  const form = createForm<T>({
    ...createFormOptions,
    extend: [validator({schema: local.schema}), reporter],
    onError: (error, ctx) => {
      createFormOptions?.onError?.(error, ctx);
      if (isAxiosError<Api.ErrorResponse>(error)) {
        error.response?.data.errors.forEach((error) => {
          if (Api.isValidationError(error)) {
            const errorMessage = t(error.code, {
              attribute: t(error.field),
              ...error.data,
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

  return (
    <FormContext.Provider value={{form, props}}>
      <form ref={form.form} {...formProps}>
        <fieldset class="contents" disabled={form.isSubmitting()}>
          {local.children}
        </fieldset>
      </form>
    </FormContext.Provider>
  );
};

/**
 * Generic form context getter. When type is passed, context is properly typed.
 *
 * Usefull in forms with deeply nested components and dependant logic
 */
export const useFormContext = <T extends Obj = Obj>() => {
  const value = useContext(FormContext as unknown as Context<FormContextValue<T>>);

  if (value === undefined) throw "useFormContext must be used inside FormContext.Provider";

  return value;
};
