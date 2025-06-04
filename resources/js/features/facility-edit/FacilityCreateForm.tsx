import {useMutation} from "@tanstack/solid-query";
import {FormType} from "components/felte-form/FelteForm";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {Admin} from "data-access/memo-api/groups/Admin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {getUrlSuggestion} from "features/facility-edit/facility_url";
import {VoidComponent, createComputed} from "solid-js";
import {FacilityForm, FacilityFormType} from "./FacilityForm";

interface Props {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const FacilityCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const facilityMutation = useMutation(() => ({
    mutationFn: Admin.createFacility,
    meta: {isFormSubmit: true},
  }));

  async function createFacility(values: FacilityFormType) {
    await facilityMutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      toastSuccess(t("forms.facility_create.success"));
      props.onSuccess?.();
      // Important: Invalidation should happen after calling onSuccess which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facilities();
    };
  }

  function initForm(form: FormType<FacilityFormType>) {
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
