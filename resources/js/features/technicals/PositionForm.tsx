import {FormConfigWithoutTransformFn} from "@felte/core";
import {useQuery} from "@tanstack/solid-query";
import {FelteForm, FormType} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {capitalizeString} from "components/ui/Capitalize";
import {ATTRIBUTES_SCHEMA, AttributeFields} from "components/ui/form/AttributeFields";
import {CheckboxField} from "components/ui/form/CheckboxField";
import {Select} from "components/ui/form/Select";
import {TextField} from "components/ui/form/TextField";
import {InfoIcon} from "components/ui/InfoIcon";
import {useLangFunc} from "components/utils/lang";
import {Attribute} from "data-access/memo-api/attributes";
import {Dictionary} from "data-access/memo-api/dictionaries";
import {useAllDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {System} from "data-access/memo-api/groups/System";
import {createComputed, Show, splitProps, VoidComponent} from "solid-js";
import {z} from "zod";

const getSchema = () =>
  z.object({
    facilityId: z.string(),
    name: z.string(),
    isDisabled: z.boolean(),
    position: ATTRIBUTES_SCHEMA,
  });

export type PositionFormType = z.infer<ReturnType<typeof getSchema>>;

/**
 * The predicate selecting the attributes editable on a position of the given dictionary:
 * the dictionary's required position attributes plus the position group attribute.
 */
export function positionFormAttributeFilter(dictionary: Dictionary | undefined) {
  const requiredIds = new Set(dictionary?.resource.positionRequiredAttributeIds ?? []);
  return (attribute: Attribute) => attribute.apiName === "positionGroupDictId" || requiredIds.has(attribute.id);
}

/**
 * The requirement level override for the attributes on a position form: the dictionary's
 * required position attributes are required here regardless of their own declared level.
 */
function positionFormRequirementLevel(dictionary: Dictionary | undefined) {
  const requiredIds = new Set(dictionary?.resource.positionRequiredAttributeIds ?? []);
  return (attribute: Attribute) => (requiredIds.has(attribute.id) ? ("required" as const) : undefined);
}

/**
 * Whether the form allows editing the attribute values. A facility position's values live in
 * the facility's scope (they can reference the facility's attributes and dictionary values,
 * which the global view does not operate in), so they are editable only in the facility
 * variant of the form; the global variant edits them only on global positions.
 */
export function positionAttributesEditable({facilityMode, facilityId}: {facilityMode: boolean; facilityId: string}) {
  return facilityMode || !facilityId;
}

interface Props extends FormConfigWithoutTransformFn<PositionFormType> {
  readonly id: string;
  readonly onCancel?: () => void;
  /** The dictionary the position belongs to. Immutable, so not present on the form itself. */
  readonly dictionaryId: string;
  /** Whether the form edits an existing position. The create-only fields are then disabled. */
  readonly editMode: boolean;
  /** Whether the form works in the facility admin variant: no facility selector. */
  readonly facilityMode: boolean;
}

export const PositionForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, ["id", "onCancel", "dictionaryId", "editMode", "facilityMode"]);
  const t = useLangFunc();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const allDictionaries = useAllDictionaries();
  const dictionary = () => allDictionaries()?.byId.get(props.dictionaryId);
  function initForm(form: FormType<PositionFormType>) {
    // When the created position switches to a facility one, the attribute values become
    // read-only, so drop anything typed in so far — it would not be saved.
    createComputed((prevFacilityId: string | undefined) => {
      const facilityId = form.data("facilityId");
      if (!props.editMode && prevFacilityId !== undefined && facilityId !== prevFacilityId) {
        form.setFields("position", {});
      }
      return facilityId;
    });
  }
  return (
    <FelteForm
      id={props.id}
      schema={getSchema()}
      translationsFormNames={[props.id, "position_form"]}
      translationsModel="position"
      {...formProps}
      onFormCreated={initForm}
      class="flex flex-col gap-4"
    >
      {(form) => {
        const attributesEditable = () =>
          positionAttributesEditable({facilityMode: props.facilityMode, facilityId: form.data("facilityId") || ""});
        return (
          <>
            <div class="flex flex-col gap-1">
              <Show when={!props.facilityMode}>
                <Select
                  name="facilityId"
                  items={(facilitiesQuery.data || []).map((facility) => ({value: facility.id, text: facility.name}))}
                  nullable
                  placeholder={capitalizeString(t("forms.position_create.global_position"))}
                  // A position of a facility dictionary always belongs to that facility.
                  disabled={props.editMode || dictionary()?.resource.facilityId != null}
                />
              </Show>
              <TextField
                name="name"
                autofocus
                label={(label) => (
                  <>
                    {label} <InfoIcon title={t("forms.position_form.name_info")} />
                  </>
                )}
              />
              <CheckboxField name="isDisabled" />
              <Show when={!attributesEditable()}>
                <div class="text-sm text-orange-600">
                  {t("forms.position_form.attributes_editable_in_facility_info")}
                </div>
              </Show>
              <AttributeFields
                model="position"
                nestFieldsUnder="position"
                selection={{model: "position", includeFixed: true}}
                attributeFilter={positionFormAttributeFilter(dictionary())}
                requirementLevelOverride={positionFormRequirementLevel(dictionary())}
                editMode={attributesEditable()}
              />
            </div>
            <FelteSubmit cancel={props.onCancel} />
          </>
        );
      }}
    </FelteForm>
  );
};
