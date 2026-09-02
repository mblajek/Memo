import {useMutation} from "@tanstack/solid-query";
import {createAttributesProcessor} from "components/ui/form/attributes_processor";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {readAttribute} from "data-access/memo-api/attributable";
import {useAllDictionaries, useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Show, VoidComponent} from "solid-js";
import {positionAttributesEditable, PositionForm, PositionFormType} from "./PositionForm";
import {itemAfter, orderForMoveBefore, reorderablePositions} from "./util";

interface Props {
  readonly id: string;
  /** Whether to patch via the facility endpoint (otherwise the global admin endpoint is used). */
  readonly facilityMode: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const PositionEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allDictionaries = useAllDictionaries();
  const attributes = useAttributes();
  const position = () => allDictionaries()?.positionsById.get(props.id);
  // The candidate "insert before" anchors: the positions ordered together with this one.
  const orderAnchors = () => {
    const resource = position()?.resource;
    const dict = resource && allDictionaries()?.byId.get(resource.dictionaryId);
    if (!dict) {
      return [];
    }
    return reorderablePositions(
      dict,
      resource.facilityId ? {scopeFacilityId: resource.facilityId} : {scopeFacilityId: undefined, globalOnly: true},
    );
  };
  const positionAttributesProcessor = createAttributesProcessor("position");
  const positionMutation = useMutation(() => ({
    mutationFn: (values: PositionFormType) => {
      // The form field holds the name without the "+" prefix.
      const oldName = (position()?.resource.name ?? "").replace(/^\+/, "");
      const attributesEditable = positionAttributesEditable({
        facilityMode: props.facilityMode,
        facilityId: values.facilityId,
      });
      // The form field holds the id of the position to insert directly before.
      const targetOrder = orderForMoveBefore(orderAnchors(), {itemId: props.id, anchorId: values.defaultOrder});
      const patch = {
        id: props.id,
        // Send the name only when changed, not to convert an unchanged translatable name into
        // its literal ("+"-prefixed) form.
        ...(values.name === oldName ? undefined : {name: `+${values.name}`}),
        ...(targetOrder === undefined ? undefined : {defaultOrder: targetOrder}),
        isDisabled: values.isDisabled,
        ...(attributesEditable ? positionAttributesProcessor.extract(values.position) : undefined),
      };
      return props.facilityMode ? FacilityAdmin.updatePosition(patch) : Admin.updatePosition(patch);
    },
    meta: {isFormSubmit: true},
  }));

  async function updatePosition(values: PositionFormType) {
    await positionMutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      props.onSuccess?.();
      toastSuccess(t("forms.position_edit.success"));
      invalidate.dictionaries();
    };
  }

  /**
   * The position's attribute values, keyed by the attribute api names. All the attributes are
   * loaded, as all of them are submitted back by the form.
   */
  function attributeValues() {
    const resource = position()!.resource;
    const values: Record<string, unknown> = {};
    for (const attribute of attributes()?.getForModel("position") || []) {
      const value = readAttribute(resource, attribute.apiName);
      if (value !== undefined) {
        values[attribute.apiName] = value;
      }
    }
    return values;
  }

  return (
    <Show when={position()}>
      {(position) => (
        <PositionForm
          id="position_edit"
          dictionaryId={position().resource.dictionaryId}
          editMode
          facilityMode={props.facilityMode}
          editedId={props.id}
          initialValues={{
            facilityId: position().resource.facilityId ?? "",
            name: position().resource.name.replace(/^\+/, ""),
            isDisabled: position().resource.isDisabled,
            position: attributeValues(),
            // The direct successor: the position is already right before it.
            defaultOrder: itemAfter(orderAnchors(), props.id) ?? "",
          }}
          onSubmit={updatePosition}
          onCancel={props.onCancel}
        />
      )}
    </Show>
  );
};

// For lazy loading
export default PositionEditForm;
