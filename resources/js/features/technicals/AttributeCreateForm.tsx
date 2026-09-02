import {useMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {useAllAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {AttributeResourceForCreate, RequirementLevel} from "data-access/memo-api/resources/attribute.resource";
import {VoidComponent} from "solid-js";
import {AttributeForm, AttributeFormType, attributeMetadataForSave} from "./AttributeForm";

interface Props {
  /** Whether to create the attribute for the active facility (otherwise the global admin endpoint is used). */
  readonly facilityMode: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const AttributeCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allAttributes = useAllAttributes();
  const attributeMutation = useMutation(() => ({
    mutationFn: (values: AttributeFormType) =>
      props.facilityMode
        ? FacilityAdmin.createAttribute(attributeForCreate(values))
        : Admin.createAttribute({...attributeForCreate(values), facilityId: values.facilityId || null}),
    meta: {isFormSubmit: true},
  }));

  function attributeForCreate(values: AttributeFormType): AttributeResourceForCreate {
    return {
      // The form field holds the id of the attribute to insert directly before.
      ...(values.defaultOrder
        ? {defaultOrder: allAttributes()?.getById(values.defaultOrder).resource.defaultOrder}
        : undefined),
      model: values.model,
      // Names without the "+" prefix are treated as translation keys, which never exist for
      // API-created attributes. The form field holds the name without the prefix.
      name: `+${values.name}`,
      apiName: values.apiName,
      type: values.type,
      dictionaryId: values.type === "dict" ? values.dictionaryId : null,
      isMultiValue: values.isMultiValue,
      // A separator never holds a value, so the empty level is the only one the backend accepts.
      requirementLevel: values.type === "separator" ? "empty" : (values.requirementLevel as RequirementLevel),
      description: values.description || null,
      metadata: attributeMetadataForSave(values.metadata),
    };
  }

  async function createAttribute(values: AttributeFormType) {
    await attributeMutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      props.onSuccess?.();
      toastSuccess(t("forms.attribute_create.success"));
      invalidate.attributes();
    };
  }

  return (
    <AttributeForm
      id="attribute_create"
      editMode={false}
      facilityMode={props.facilityMode}
      allowRequired
      initialValues={{
        facilityId: "",
        model: "client",
        name: "",
        apiName: "",
        type: "string",
        dictionaryId: "",
        isMultiValue: false,
        requirementLevel: "optional",
        description: "",
        metadata: "",
        defaultOrder: "",
      }}
      onSubmit={createAttribute}
      onCancel={props.onCancel}
    />
  );
};

// For lazy loading
export default AttributeCreateForm;
