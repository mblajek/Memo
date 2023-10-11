import {createMutation, createQuery} from "@tanstack/solid-query";
import {QueryBarrier, useLangFunc} from "components/utils";
import {Admin, System} from "data-access/memo-api/groups";
import {Api} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";
import toast from "solid-toast";
import {FacilityForm, FacilityFormOutput} from "./FacilityForm";

interface FormParams {
  id: Api.Id;
}

interface Props extends FormParams {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const FacilityEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  // If there ever will be editable admin fields in facility, we should add /admin/facility/list endpoint.
  // For now, it's just public name & url, so we can take it from System which we always fetch anyway.
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const oldFacility = () => facilitiesQuery.data?.find((facility) => facility.id === props.id);

  const adminInvalidator = Admin.useInvalidator();
  const systemInvalidator = System.useInvalidator();
  const facilityMutation = createMutation(() => ({
    mutationFn: Admin.updateFacility,
    meta: {isFormSubmit: true},
  }));

  async function updateFacility(values: FacilityFormOutput) {
    // First mutate the user fields (without the members).
    await facilityMutation.mutateAsync({
      id: props.id,
      name: values.name,
      url: values.url,
    });
    props.onSuccess?.();
    toast.success(t("forms.user_edit.success"));
    adminInvalidator.facilities();
    systemInvalidator.facilities();
  }

  const initialValues = () => {
    return {
      name: oldFacility()?.name,
      url: oldFacility()?.url,
    };
  };

  return (
    <QueryBarrier queries={[facilitiesQuery]}>
      <FacilityForm
        id="facility_edit"
        initialValues={initialValues()}
        onSubmit={updateFacility}
        onCancel={props.onCancel}
      />
    </QueryBarrier>
  );
};

// For lazy loading
export default FacilityEditForm;
