import {useMutation} from "@tanstack/solid-query";
import {useLangFunc} from "components/utils/lang";
import {toastSuccess} from "components/utils/toast";
import {Admin} from "data-access/memo-api/groups/Admin";
import {FacilityAdmin} from "data-access/memo-api/groups/FacilityAdmin";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {DictionaryResourceForCreate} from "data-access/memo-api/resources/dictionary.resource";
import {VoidComponent} from "solid-js";
import {DictionaryForm, DictionaryFormType} from "./DictionaryForm";

interface Props {
  /** Whether to create the dictionary for the active facility (otherwise the global admin endpoint is used). */
  readonly facilityMode: boolean;
  readonly onSuccess?: () => void;
  readonly onCancel?: () => void;
}

export const DictionaryCreateForm: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const invalidate = useInvalidator();
  const dictionaryMutation = useMutation(() => ({
    mutationFn: (values: DictionaryFormType) =>
      props.facilityMode
        ? FacilityAdmin.createDictionary(dictionaryForCreate(values))
        : Admin.createDictionary({
            ...dictionaryForCreate(values),
            facilityId: values.facilityId || null,
            // A facility dictionary is always extendable.
            isExtendable: values.facilityId ? true : values.isExtendable,
          }),
    meta: {isFormSubmit: true},
  }));

  function dictionaryForCreate(values: DictionaryFormType): DictionaryResourceForCreate {
    return {
      // Names without the "+" prefix are treated as translation keys, which never exist for
      // API-created dictionaries. The form field holds the name without the prefix.
      name: `+${values.name}`,
      positionRequiredAttributeIds: values.positionRequiredAttributeIds.length
        ? values.positionRequiredAttributeIds
        : null,
    };
  }

  async function createDictionary(values: DictionaryFormType) {
    await dictionaryMutation.mutateAsync(values);
    // eslint-disable-next-line solid/reactivity
    return () => {
      props.onSuccess?.();
      toastSuccess(t("forms.dictionary_create.success"));
      invalidate.dictionaries();
    };
  }

  return (
    <DictionaryForm
      id="dictionary_create"
      editMode={false}
      facilityMode={props.facilityMode}
      initialValues={{facilityId: "", name: "", isExtendable: true, positionRequiredAttributeIds: []}}
      onSubmit={createDictionary}
      onCancel={props.onCancel}
    />
  );
};

// For lazy loading
export default DictionaryCreateForm;
