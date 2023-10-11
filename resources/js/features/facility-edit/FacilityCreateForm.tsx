import {createMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils";
import {Admin, System} from "data-access/memo-api";
import {VoidComponent, createComputed} from "solid-js";
import toast from "solid-toast";
import {FacilityForm, FacilityFormInput, FacilityFormOutput} from "./FacilityForm";
import {trimInput} from "components/ui";
import {FormType} from "components/felte-form";

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/** Produces best effort suggestion for the url, e.g. "My Facility Name" --> "my-facility-name" */
function getUrlSuggestion(name: string) {
  return (
    trimInput(
      name
        .toLowerCase()
        .normalize("NFD")
        // Remove diacritics, especially for polish characters: https://stackoverflow.com/a/37511463/1832228
        .replace(/\p{Diacritic}/gu, "")
        .replace("ł", "l")
        // Treat dash as space before trimInput, so we trim repeated and trailing dashes together with spaces.
        .replaceAll("-", " ")
        // Remove everything that wasn't converted to ascii
        .replaceAll(/[^a-z0-9 ]/g, ""),
    )
      // Restore dash as delimiter
      .replaceAll(" ", "-")
  );
}

export const FacilityCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const adminInvalidator = Admin.useInvalidator();
  const systemInvalidator = System.useInvalidator();
  const facilityMutation = createMutation(() => ({
    mutationFn: Admin.createFacility,
    meta: {isFormSubmit: true},
  }));

  async function createFacility(values: FacilityFormOutput) {
    await facilityMutation.mutateAsync({
      name: values.name,
      url: values.url,
    });
    adminInvalidator.facilities();
    systemInvalidator.facilities();
    toast.success(t("forms.facility_create.success"));
    props.onSuccess?.();
  }

  function initForm(form: FormType<FacilityFormInput>) {
    createComputed((lastSuggestion: string | undefined) => {
      const suggestion = getUrlSuggestion(form.data("name") || "");
      if (form.data("url") === lastSuggestion) {
        form.setFields("url", suggestion);
      }
      return suggestion;
    });
  }

  return (
    <FacilityForm id="facility_create" onSubmit={createFacility} onCancel={props.onCancel} onFormCreated={initForm} />
  );
};

// For lazy loading
export default FacilityCreateForm;
