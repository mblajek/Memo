import {FormConfigWithoutTransformFn} from "@felte/core";
import {useQuery} from "@tanstack/solid-query";
import {FelteForm} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {capitalizeString} from "components/ui/Capitalize";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {Select} from "components/ui/form/Select";
import {TextField} from "components/ui/form/TextField";
import {InfoIcon} from "components/ui/InfoIcon";
import {useLangFunc} from "components/utils/lang";
import {useAllAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {System} from "data-access/memo-api/groups/System";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {HideableSection} from "components/ui/HideableSection";
import {createSignal, Show, splitProps, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";

const getSchema = () =>
  z.object({
    facilityId: z.string(),
    name: z.string(),
    isExtendable: z.boolean(),
    positionRequiredAttributeIds: z.array(z.string()),
  });

export type DictionaryFormType = z.infer<ReturnType<typeof getSchema>>;

interface Props extends FormConfigWithoutTransformFn<DictionaryFormType> {
  readonly id: string;
  readonly onCancel?: () => void;
  /** Whether the form edits an existing dictionary. The create-only fields are then disabled. */
  readonly editMode: boolean;
  /**
   * Whether the form works in the facility admin variant: no facility selector, no
   * extendability control (a facility dictionary is always extendable).
   */
  readonly facilityMode: boolean;
}

export const DictionaryForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel", "editMode", "facilityMode"]);
  const t = useLangFunc();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const allAttributes = useAllAttributes();
  const [advancedViewChecked, setAdvancedViewChecked] = createSignal(false);
  // The switch exists only in the facility variant; the global admin forms are always advanced.
  const advancedView = () => !props.facilityMode || advancedViewChecked();
  return (
    <FelteForm
      id={props.id}
      schema={getSchema()}
      translationsModel="dictionary"
      {...formProps}
      class="flex flex-col gap-4"
    >
      {(form) => {
        // Only the position attributes usable by the dictionary's positions can be required:
        // the global ones plus those of the dictionary's facility.
        const requirableAttributeItems = () => {
          const scopeFacilityId = props.facilityMode ? activeFacilityId() : form.data("facilityId") || undefined;
          return (allAttributes()?.getForModel("position") || [])
            .filter(
              (attribute) =>
                attribute.type !== "separator" && facilityIdMatches(attribute.resource.facilityId, scopeFacilityId),
            )
            .map((attribute) => ({value: attribute.id, text: attribute.label}));
        };
        return (
          <>
            <div class="flex flex-col">
              <Show when={props.facilityMode}>
                <div class="flex justify-end">
                  <CheckboxInput
                    checked={advancedViewChecked()}
                    onChecked={setAdvancedViewChecked}
                    labelBefore={<span class="font-normal">{t("forms.generic.advanced_view")} </span>}
                  />
                </div>
              </Show>
              <div class="flex flex-col gap-1">
                <Show when={!props.facilityMode}>
                  <Select
                    name="facilityId"
                    items={(facilitiesQuery.data || []).map((facility) => ({value: facility.id, text: facility.name}))}
                    nullable
                    placeholder={capitalizeString(t("forms.dictionary_create.global_dictionary"))}
                    disabled={props.editMode}
                  />
                </Show>
                <TextField
                  name="name"
                  autofocus
                  label={(label) => (
                    <>
                      {label} <InfoIcon title={t("forms.dictionary_form.name_info")} />
                    </>
                  )}
                />
                {/* A facility dictionary is always extendable, so extendability is only selectable for global ones. */}
                <HideableSection show={!props.facilityMode && !form.data("facilityId")}>
                  <CheckboxField name="isExtendable" />
                </HideableSection>
                {/* TODO: Adding a required attribute to a dictionary that already has positions fails
                until every position has a value, but the UI has no way to set values of an attribute
                that is not yet required. Consider some flow for this. */}
                <HideableSection show={advancedView()}>
                  <Select name="positionRequiredAttributeIds" items={requirableAttributeItems()} multiple />
                </HideableSection>
              </div>
            </div>
            <FelteSubmit cancel={props.onCancel} />
          </>
        );
      }}
    </FelteForm>
  );
};
