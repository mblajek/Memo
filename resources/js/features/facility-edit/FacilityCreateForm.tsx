import {createMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils";
import {Admin, System} from "data-access/memo-api";
import {VoidComponent} from "solid-js";
import toast from "solid-toast";
import {FacilityForm, FacilityFormOutput} from "./FacilityForm";

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
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
    toast.success(t("forms.facility_create.success"));
    props.onSuccess?.();
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    adminInvalidator.facilities();
    systemInvalidator.facilities();
  }

  return <FacilityForm id="facility_create" onSubmit={createFacility} onCancel={props.onCancel} />;
};

// For lazy loading
export default FacilityCreateForm;
