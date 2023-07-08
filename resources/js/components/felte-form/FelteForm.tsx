import {
  AssignableErrors,
  FormConfigWithoutTransformFn,
  Obj,
} from "@felte/core";
import { reporter } from "@felte/reporter-solid";
import { createForm } from "@felte/solid";
import { validator } from "@felte/validator-zod";
import { useTransContext } from "@mbarzda/solid-i18next";
import { isAxiosError } from "axios";
import { Api } from "data-access/memo-api/types";
import { Context, JSX, createContext, splitProps, useContext } from "solid-js";
import toast from "solid-toast";
import { ZodSchema } from "zod";

type FormContextValue<T extends Obj> = {
  props: FormProps<T>;
  form: ReturnType<typeof createForm<T>>;
};

const FormContext = createContext(undefined, {
  name: "FormContext",
});

type FormProps<T extends Obj> = Omit<
  JSX.FormHTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> &
  FormConfigWithoutTransformFn<T> & {
    schema: ZodSchema<T>;
  };

/**
 * Wrapper for felte's `createForm`
 *
 * Includes solidjs' Provider, that stores
 * createForm's data and component props
 */
export const FelteForm = <T extends Obj>(props: FormProps<T>) => {
  const [t] = useTransContext();
  const [local, createFormOptions, others] = splitProps(
    props,
    ["children", "schema"],
    [
      "debounced",
      "extend",
      "initialValues",
      "onError",
      "onSubmit",
      "onSuccess",
      "transform",
      "validate",
      "warn",
    ]
  );

  const form = createForm<T>({
    ...createFormOptions,
    extend: [validator({ schema: local.schema }), reporter],
    onError: (error, ctx) => {
      createFormOptions?.onError?.(error, ctx);
      if (isAxiosError<Api.ErrorResponse>(error)) {
        const validationErrors = error.response?.data.errors.reduce(
          (prev, curr) => {
            if (Api.isValidationError(curr)) {
              // @ts-ignore
              prev[curr.field] = t(curr.code, {
                attribute: t(curr.field),
                ...curr.data,
              });
            }
            return prev;
          },
          {} as AssignableErrors<T>
        );
        if (validationErrors) ctx.setErrors(validationErrors);
        error.response?.data.errors.filter(Api.isBaseError).forEach((error) => {
          toast.error(t(error.code));
        });
      }
    },
  });

  return (
    <FormContext.Provider value={{ form, props }}>
      <form ref={form.form} {...others}>
        <fieldset class="contents" disabled={form.isSubmitting()}>
          {local.children}
        </fieldset>
      </form>
    </FormContext.Provider>
  );
};

export const useFormContext = <T extends Obj>() => {
  const value = useContext(
    FormContext as unknown as Context<FormContextValue<T>>
  );

  if (value === undefined)
    throw "useFormContext must be used inside FormContext.Provider";

  return value;
};
