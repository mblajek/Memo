import {FormConfigWithoutTransformFn} from "@felte/core";
import {useQuery} from "@tanstack/solid-query";
import {FelteForm, FormType} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {capitalizeString} from "components/ui/Capitalize";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {MultilineTextField} from "components/ui/form/MultilineTextField";
import {Select} from "components/ui/form/Select";
import {TextField} from "components/ui/form/TextField";
import {HideableSection} from "components/ui/HideableSection";
import {InfoIcon} from "components/ui/InfoIcon";
import {useLangFunc} from "components/utils/lang";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {System} from "data-access/memo-api/groups/System";
import {AttributeMetadataResource, REQUIREMENT_LEVELS} from "data-access/memo-api/resources/attribute.resource";
import {facilityIdMatches} from "data-access/memo-api/utils";
import {createComputed, createSignal, Show, splitProps, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";
import {apiNameMatchesName, getApiNameSuggestion} from "./attribute_api_name";

// The backend whitelist of models supporting attribute values.
const GLOBAL_MODELS = ["client", "dictionary", "position"];
// The models available to facility admins.
const FACILITY_MODELS = ["client"];
// The model-referencing types (users, clients, attributes) are omitted: attributes of these types
// exist but creating them is an exotic operation, better left to a DB migration.
const TYPES = ["string", "text", "int", "bool", "date", "datetime", "dict", "separator"];

const getSchema = () =>
  z.object({
    facilityId: z.string(),
    model: z.string(),
    name: z.string(),
    apiName: z.string(),
    type: z.string(),
    dictionaryId: z.string(),
    isMultiValue: z.boolean(),
    requirementLevel: z.string(),
    description: z.string(),
    metadata: z.string(),
  });

export type AttributeFormType = z.infer<ReturnType<typeof getSchema>>;

/**
 * Converts the metadata field text into the request value. Non-JSON text is sent as typed,
 * for the backend to reject it (the field must hold a JSON object).
 */
export function attributeMetadataForSave(value: string): AttributeMetadataResource | null {
  if (!value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value) as AttributeMetadataResource;
  } catch {
    return value as unknown as AttributeMetadataResource;
  }
}

interface Props extends FormConfigWithoutTransformFn<AttributeFormType> {
  readonly id: string;
  readonly onCancel?: () => void;
  /** Whether the form edits an existing attribute. The create-only fields are then not shown. */
  readonly editMode: boolean;
  /**
   * Whether the form works in the facility admin variant: restricted models, no facility
   * selector, advanced view off by default.
   */
  readonly facilityMode: boolean;
  /** Whether the required level can be selected. Editing can never escalate the level to required. */
  readonly allowRequired: boolean;
}

export const AttributeForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel", "editMode", "facilityMode", "allowRequired"]);
  const t = useLangFunc();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const allDictionaries = useAllDictionaries();
  const [advancedViewChecked, setAdvancedViewChecked] = createSignal(false);
  // The switch exists only in the facility variant; the global admin forms are always advanced.
  const advancedView = () => !props.facilityMode || advancedViewChecked();
  const dictionaryItems = () =>
    [...(allDictionaries() || [])]
      .filter(
        (dictionary) =>
          !props.facilityMode || facilityIdMatches(dictionary.resource.facilityId, activeFacilityId()),
      )
      .map((dictionary) => ({value: dictionary.id, text: dictionary.name}));
  function initForm(form: FormType<AttributeFormType>) {
    // Keep the api name following the name, as long as it is the one generated from the name
    // (a manually customised api name is left alone).
    createComputed((prevName: string | undefined) => {
      const name = form.data("name") || "";
      if (prevName !== undefined && name !== prevName && apiNameMatchesName(form.data("apiName") || "", prevName)) {
        form.setFields("apiName", getApiNameSuggestion(name, form.data("apiName") || ""));
      }
      return name;
    });
  }
  return (
    <FelteForm
      id={props.id}
      schema={getSchema()}
      translationsModel="attribute"
      {...formProps}
      onFormCreated={initForm}
      class="flex flex-col gap-4"
    >
      {(form) => {
        // In edit mode the current value may fall outside the creatable set (e.g. a model
        // added by a migration); append it so the disabled select can display it.
        const withCurrent = (values: readonly string[], field: "model" | "type") => {
          const current = form.data(field);
          return !props.editMode || !current || values.includes(current) ? values : [...values, current];
        };
        return (
          <>
            <div class="flex flex-col">
              <Show when={props.facilityMode}>
                <div class="flex justify-end">
                  <CheckboxInput
                    checked={advancedViewChecked()}
                    onChecked={setAdvancedViewChecked}
                    labelBefore={<span class="font-normal">{t("forms.attribute_form.advanced_view")} </span>}
                  />
                </div>
              </Show>
              <div class="flex flex-col gap-1">
                <Show when={!props.facilityMode}>
                  <Select
                    name="facilityId"
                    items={(facilitiesQuery.data || []).map((facility) => ({value: facility.id, text: facility.name}))}
                    nullable
                    placeholder={capitalizeString(t("forms.attribute_create.global_attribute"))}
                    disabled={props.editMode}
                  />
                </Show>
                <Select
                  name="model"
                  items={withCurrent(props.facilityMode ? FACILITY_MODELS : GLOBAL_MODELS, "model").map((model) => ({
                    value: model,
                  }))}
                  nullable={false}
                  disabled={props.editMode}
                />
                <TextField
                  name="name"
                  autofocus
                  label={(label) => (
                    <>
                      {label} <InfoIcon title={t("forms.attribute_form.name_info")} />
                    </>
                  )}
                />
                <HideableSection show={advancedView()}>
                  <TextField name="apiName" class="font-mono text-sm" />
                </HideableSection>
                <Select
                  name="type"
                  items={withCurrent(TYPES, "type").map((type) => ({value: type}))}
                  nullable={false}
                  disabled={props.editMode}
                />
                <HideableSection show={form.data("type") === "dict"}>
                  <Select
                    name="dictionaryId"
                    items={dictionaryItems()}
                    nullable={false}
                    disabled={props.editMode}
                  />
                </HideableSection>
                <CheckboxField
                  name="isMultiValue"
                  disabled={props.editMode}
                  label={(label) => (
                    <>
                      {label} <InfoIcon title={t("forms.attribute_form.is_multi_value_info")} />
                    </>
                  )}
                />
                <HideableSection show={form.data("type") !== "separator"}>
                  <Select
                    name="requirementLevel"
                    items={REQUIREMENT_LEVELS.map((level) =>
                      level === "required" && !props.allowRequired
                        ? {
                            value: level,
                            disabled: true,
                            labelOnList: () => (
                              <>
                                {level} <InfoIcon title={t("forms.attribute_form.allow_required_only_on_create")} />
                              </>
                            ),
                          }
                        : {value: level},
                    )}
                    nullable={false}
                  />
                </HideableSection>
                <MultilineTextField name="description" />
                <HideableSection show={advancedView()}>
                  <TextField name="metadata" class="font-mono text-sm" />
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
