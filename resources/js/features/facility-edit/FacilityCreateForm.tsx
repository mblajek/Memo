import {createMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils";
import {Admin} from "data-access/memo-api";
import {VoidComponent} from "solid-js";
import toast from "solid-toast";
import {FacilityEdit} from "./FacilityEdit";

interface Props {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const FacilityCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = Admin.useInvalidator();
  const facilityMutation = createMutation(() => ({
    mutationFn: Admin.createFacility,
    meta: {isFormSubmit: true},
  }));

  async function createFacility(values: FacilityEdit.Output) {
    // First create the user fields (without the members).
    await facilityMutation.mutateAsync({
      name: values.name,
      url: values.url,
    });
    invalidate.facilities();
    toast.success(t("forms.facility_create.success"));
    props.onSuccess?.();
  }

  return <FacilityEdit.EditForm id="facility_create" onSubmit={createFacility} onCancel={props.onCancel} />;
};

export default FacilityCreateForm;
