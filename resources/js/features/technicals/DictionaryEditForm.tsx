import {useMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Show, VoidComponent} from "solid-js";
import {DictionaryForm, DictionaryFormType} from "./DictionaryForm";

interface Props {
  readonly id: string;
  /** Whether to patch via the facility endpoint (otherwise the global admin endpoint is used). */
  readonly facilityMode: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const DictionaryEditForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const allDictionaries = useAllDictionaries();
  const dictionary = () => allDictionaries()?.get(props.id);
  const dictionaryMutation = useMutation(() => ({
    mutationFn: (values: DictionaryFormType) => {
      // The form field holds the name without the "+" prefix.
      const oldName = (dictionary()?.resource.name ?? "").replace(/^\+/, "");
      const oldRequiredIds = dictionary()?.resource.positionRequiredAttributeIds ?? [];
      const requiredIdsChanged =
        values.positionRequiredAttributeIds.length !== oldRequiredIds.length ||
        values.positionRequiredAttributeIds.some((id, index) => id !== oldRequiredIds[index]);
      const patch = {
        id: props.id,
        // Send the name only when changed, not to convert an unchanged translatable name into
        // its literal ("+"-prefixed) form.
        ...(values.name === oldName ? undefined : {name: `+${values.name}`}),
        ...(requiredIdsChanged
          ? {
              positionRequiredAttributeIds: values.positionRequiredAttributeIds.length
                ? values.positionRequiredAttributeIds
                : null,
            }
          : undefined),
      };
      return props.facilityMode
        ? FacilityAdmin.updateDictionary(patch)
        : Admin.updateDictionary({
            ...patch,
            // A facility dictionary is always extendable.
            isExtendable: values.facilityId ? true : values.isExtendable,
          });
    },
    meta: {isFormSubmit: true},
  }));

  async function updateDictionary(values: DictionaryFormType) {
    await dictionaryMutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      props.onSuccess?.();
      toastSuccess(t("forms.dictionary_edit.success"));
      invalidate.dictionaries();
    };
  }

  return (
    <Show when={dictionary()}>
      {(dictionary) => (
        <DictionaryForm
          id="dictionary_edit"
          editMode
          facilityMode={props.facilityMode}
          initialValues={{
            facilityId: dictionary().resource.facilityId ?? "",
            name: dictionary().resource.name.replace(/^\+/, ""),
            isExtendable: dictionary().resource.isExtendable,
            positionRequiredAttributeIds: [...(dictionary().resource.positionRequiredAttributeIds ?? [])],
          }}
          onSubmit={updateDictionary}
          onCancel={props.onCancel}
        />
      )}
    </Show>
  );
};

// For lazy loading
export default DictionaryEditForm;
