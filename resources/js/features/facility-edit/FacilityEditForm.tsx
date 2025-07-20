import {useMutation, useQuery} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {notFoundError} from "components/utils/NotFoundError";
import {QueryBarrier} from "components/utils/QueryBarrier";
import {toastSuccess} from "components/utils/toast";
import {Admin} from "data-access/memo-api/groups/Admin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Api} from "data-access/memo-api/types";
import {VoidComponent} from "solid-js";
import {FacilityForm, FacilityFormType} from "./FacilityForm";

interface FormParams {
  readonly id: Api.Id;
}

interface Props extends FormParams {
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const FacilityEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const facilitiesQuery = useQuery(Admin.facilitiesQueryOptions);
  const oldFacility = () => facilitiesQuery.data?.find((facility) => facility.id === props.id);

  const invalidate = useInvalidator();
  const facilityMutation = useMutation(() => ({
    mutationFn: Admin.updateFacility,
    meta: {isFormSubmit: true},
  }));

  async function updateFacility(values: FacilityFormType) {
    await facilityMutation.mutateAsync({
      id: props.id,
      ...values,
    });
    // eslint-disable-next-line solid/reactivity
    return () => {
      props.onSuccess?.();
      toastSuccess(t("forms.user_edit.success"));
      // Important: Invalidation should happen after calling onSuccess which typically closes the form.
      // Otherwise the queries used by this form start fetching data immediately, which not only makes no sense,
      // but also causes problems apparently.
      invalidate.facilities();
    };
  }

  const initialValues = () => {
    const facility = oldFacility();
    return facility
      ? ({
          name: facility.name,
          url: facility.url,
          meetingNotificationTemplateSubject: facility.meetingNotificationTemplateSubject || "",
        } satisfies FacilityFormType)
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
