import {useMutation} from "@tanstack/solid-query";
import {createAttributesProcessor} from "components/ui/form/attributes_processor";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {VoidComponent} from "solid-js";
import {positionAttributesEditable, PositionForm, PositionFormType} from "./PositionForm";

interface Props {
  readonly dictionaryId: string;
  /** Whether to create the position for the active facility (otherwise the global admin endpoint is used). */
  readonly facilityMode: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const PositionCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allDictionaries = useAllDictionaries();
  const positionAttributesProcessor = createAttributesProcessor("position");
  const positionMutation = useMutation(() => ({
    mutationFn: (values: PositionFormType) =>
      props.facilityMode
        ? FacilityAdmin.createPosition(positionForCreate(values))
        : Admin.createPosition({...positionForCreate(values), facilityId: values.facilityId || null}),
    meta: {isFormSubmit: true},
  }));

  function positionForCreate(values: PositionFormType) {
    const attributesEditable = positionAttributesEditable({
      facilityMode: props.facilityMode,
      facilityId: values.facilityId,
    });
    return {
      dictionaryId: props.dictionaryId,
      // The form field holds the id of the position to insert directly before.
      ...(values.defaultOrder
        ? {defaultOrder: allDictionaries()!.getPositionById(values.defaultOrder).resource.defaultOrder}
        : undefined),
      // Names without the "+" prefix are treated as translation keys, which never exist for
      // API-created positions. The form field holds the name without the prefix.
      name: `+${values.name}`,
      isDisabled: values.isDisabled,
      ...(attributesEditable ? positionAttributesProcessor.extract(values.position) : undefined),
    };
  }

  async function createPosition(values: PositionFormType) {
    await positionMutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      props.onSuccess?.();
      toastSuccess(t("forms.position_create.success"));
      invalidate.dictionaries();
    };
  }

  return (
    <PositionForm
      id="position_create"
      dictionaryId={props.dictionaryId}
      editMode={false}
      facilityMode={props.facilityMode}
      initialValues={{
        facilityId: allDictionaries()?.byId.get(props.dictionaryId)?.resource.facilityId ?? "",
        name: "",
        isDisabled: false,
        position: {},
        defaultOrder: "",
      }}
      onSubmit={createPosition}
      onCancel={props.onCancel}
    />
  );
};

// For lazy loading
export default PositionCreateForm;
