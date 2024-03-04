import {createMutation} from "@tanstack/solid-query";
import {FormType} from "components/felte-form/FelteForm";
import {trimInput} from "components/ui/form/util";
import {useLangFunc} from "components/utils";
import {toastSuccess} from "components/utils/toast";
import {Admin} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {VoidComponent, createComputed} from "solid-js";
import {FacilityForm, FacilityFormInput, FacilityFormOutput} from "./FacilityForm";

interface Props {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

/** Produces best effort suggestion for the url, e.g. "My Facility Name" --> "my-facility-name" */
export function getUrlSuggestion(name: string) {
  return (
    trimInput(
      name
        .toLowerCase()
        .normalize("NFD")
        // Remove diacritics, especially for polish characters: https://stackoverflow.com/a/37511463/1832228
        .replaceAll(/\p{Diacritic}/gu, "")
        .replaceAll("ł", "l")
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
  const invalidate = useInvalidator();
  const facilityMutation = createMutation(() => ({
    mutationFn: Admin.createFacility,
    meta: {isFormSubmit: true},
  }));

  async function createFacility(values: FacilityFormOutput) {
    await facilityMutation.mutateAsync({
      name: values.name,
      url: values.url,
    });
    toastSuccess(t("forms.facility_create.success"));
    props.onSuccess?.();
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facilities();
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
