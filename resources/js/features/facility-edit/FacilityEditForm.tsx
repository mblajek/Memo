import {createMutation, createQuery} from "@tanstack/solid-query";
import {QueryBarrier, useLangFunc} from "components/utils";
import {notFoundError} from "components/utils/NotFoundError";
import {Admin, System} from "data-access/memo-api/groups";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";
import toast from "solid-toast";
import {FacilityForm, FacilityFormInput, FacilityFormOutput} from "./FacilityForm";

interface FormParams {
  readonly id: Api.Id;
}

interface Props extends FormParams {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const FacilityEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  // If there ever will be editable admin fields in facility, we should add /admin/facility/list endpoint.
  // For now, it's just public name & url, so we can take it from System which we always fetch anyway.
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);
  const oldFacility = () => facilitiesQuery.data?.find((facility) => facility.id === props.id);

  const invalidate = useInvalidator();
  const facilityMutation = createMutation(() => ({
    mutationFn: Admin.updateFacility,
    meta: {isFormSubmit: true},
  }));

  async function updateFacility(values: FacilityFormOutput) {
    await facilityMutation.mutateAsync({
      id: props.id,
      name: values.name,
      url: values.url,
    });
    props.onSuccess?.();
    toast.success(t("forms.user_edit.success"));
    // Important: Invalidation should happen after calling onSuccess which typically closes the form.
    // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
    // but also causes problems apparently.
    invalidate.facilities();
  }

  const initialValues = () => {
    const facility = oldFacility();
    return facility
      ? ({
          name: facility.name,
          url: facility.url,
        } satisfies FacilityFormInput)
      : {};
  };

  return (
    <QueryBarrier queries={[facilitiesQuery]} ignoreCachedData {...notFoundError()}>
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
