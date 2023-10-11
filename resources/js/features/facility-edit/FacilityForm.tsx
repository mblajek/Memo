import {FormConfigWithoutTransformFn} from "@felte/core";
import {FelteForm, FelteSubmit} from "components/felte-form";
import {TextField, getTrimInputHandler, trimInput} from "components/ui";
import {VoidComponent, createComputed, splitProps} from "solid-js";
import {z} from "zod";

/** Produces best effort suggestion for the url, e.g. "My Facility Name" --> "my-facility-name" */
function getUrlSuggestion(name: string) {
  const url = trimInput(name).toLowerCase().replaceAll(" ", "-");
  // Remove diacritics, especially for polish characters.
  // https://stackoverflow.com/a/37511463/1832228
  return url
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace("ł", "l");
}

const getSchema = () =>
  z.object({
    name: z.string(),
    url: z.string(),
  });

export type FacilityFormInput = z.input<ReturnType<typeof getSchema>>;
export type FacilityFormOutput = z.output<ReturnType<typeof getSchema>>;

type FormProps = FormConfigWithoutTransformFn<FacilityFormInput>;
type MyProps = {
  onCancel?: () => void;
  id: string;
};
type Props = FormProps & MyProps;

export const FacilityForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps]: [MyProps, FormProps] = splitProps(allProps, ["id", "onCancel"]);
  return (
    <FelteForm id={props.id} schema={getSchema()} {...formProps} class="flex flex-col gap-4">
      {(form) => {
        createComputed((lastSuggestion: string | undefined) => {
          const suggestion = getUrlSuggestion(form.data("name") || "");
          if (form.data("url") === lastSuggestion) {
            form.setFields("url", suggestion);
          }
          return suggestion;
        });
        return (
          <>
            <div class="flex flex-col gap-1">
              <TextField name="name" type="text" onBlur={getTrimInputHandler()} />
              <TextField name="url" type="text" onBlur={getTrimInputHandler()} />
            </div>
            <FelteSubmit cancel={props.onCancel} />
          </>
        );
      }}
    </FelteForm>
  );
};
