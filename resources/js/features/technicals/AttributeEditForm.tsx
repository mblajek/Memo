import {useMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {useAllAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {RequirementLevel} from "data-access/memo-api/resources/attribute.resource";
import {Show, VoidComponent} from "solid-js";
import {AttributeForm, AttributeFormType, attributeMetadataForSave} from "./AttributeForm";
import {itemAfter, orderForMoveBefore, reorderableAttributes} from "./util";

interface Props {
  readonly id: string;
  /** Whether to patch via the facility endpoint (otherwise the global admin endpoint is used). */
  readonly facilityMode: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const AttributeEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allAttributes = useAllAttributes();
  const attribute = () => allAttributes()?.getById(props.id);
  // The candidate "insert before" anchors: the attributes ordered together with this one.
  const orderAnchors = () => {
    const resource = attribute()?.resource;
    return resource
      ? reorderableAttributes(allAttributes(), {
          model: resource.model,
          scopeFacilityId: resource.facilityId ?? undefined,
        })
      : [];
  };
  const attributeMutation = useMutation(() => ({
    mutationFn: props.facilityMode ? FacilityAdmin.updateAttribute : Admin.updateAttribute,
    meta: {isFormSubmit: true},
  }));

  async function updateAttribute(values: AttributeFormType) {
    // The form field holds the name without the "+" prefix.
    const oldName = (attribute()?.resource.name ?? "").replace(/^\+/, "");
    // The form field holds the id of the attribute to insert directly before.
    const targetOrder = orderForMoveBefore(orderAnchors(), {itemId: props.id, anchorId: values.defaultOrder});
    await attributeMutation.mutateAsync({
      id: props.id,
      // Send the name only when changed, not to convert an unchanged translatable name into
      // its literal ("+"-prefixed) form.
      ...(values.name === oldName ? undefined : {name: `+${values.name}`}),
      ...(targetOrder === undefined ? undefined : {defaultOrder: targetOrder}),
      apiName: values.apiName,
      // A separator never holds a value, so the empty level is the only one the backend accepts.
      requirementLevel: values.type === "separator" ? "empty" : (values.requirementLevel as RequirementLevel),
      description: values.description || null,
      metadata: attributeMetadataForSave(values.metadata),
    });
    // eslint-disable-next-line solid/reactivity
    return () => {
      props.onSuccess?.();
      toastSuccess(t("forms.attribute_edit.success"));
      invalidate.attributes();
    };
  }

  return (
    <Show when={attribute()}>
      {(attribute) => (
        <AttributeForm
          id="attribute_edit"
          editMode
          facilityMode={props.facilityMode}
          allowRequired={attribute().resource.requirementLevel === "required"}
          editedId={props.id}
          initialValues={{
            facilityId: attribute().resource.facilityId ?? "",
            model: attribute().resource.model,
            name: attribute().resource.name.replace(/^\+/, ""),
            apiName: attribute().apiName,
            type: String(attribute().resource.type),
            dictionaryId: attribute().resource.dictionaryId ?? "",
            isMultiValue: attribute().resource.isMultiValue ?? false,
            requirementLevel: attribute().resource.requirementLevel,
            description: attribute().resource.description ?? "",
            metadata: attribute().resource.metadata ? JSON.stringify(attribute().resource.metadata) : "",
            // The direct successor: the attribute is already right before it.
            defaultOrder: itemAfter(orderAnchors(), props.id) ?? "",
          }}
          onSubmit={updateAttribute}
          onCancel={props.onCancel}
        />
      )}
    </Show>
  );
};

// For lazy loading
export default AttributeEditForm;
