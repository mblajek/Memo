import {FormConfigWithoutTransformFn} from "@felte/core";
import {useQuery} from "@tanstack/solid-query";
import {FelteForm, FormType} from "components/felte-form/FelteForm";
import {FelteSubmit} from "components/felte-form/FelteSubmit";
import {capitalizeString} from "components/ui/Capitalize";
import {AttributeFields, ATTRIBUTES_SCHEMA} from "components/ui/form/AttributeFields";
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
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";
import {OrderItemRow, PositionOrderLabel} from "./order_items";
import {reorderablePositions, useFacilityName} from "./util";

const getSchema = () =>
  z.object({
    facilityId: z.string(),
    name: z.string(),
    isDisabled: z.boolean(),
    position: ATTRIBUTES_SCHEMA,
    // The id of the position to insert this one directly before (empty: at the end).
    defaultOrder: z.string(),
  });

export type PositionFormType = z.infer<ReturnType<typeof getSchema>>;

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
  /** The id of the edited position, disabled as the "insert before" anchor of itself. */
  readonly editedId?: string;
}

export const PositionForm: VoidComponent<Props> = (allProps) => {
  const [props, formProps] = splitProps(allProps, [
    "id",
    "onCancel",
    "dictionaryId",
    "editMode",
    "facilityMode",
    "editedId",
  ]);
  const t = useLangFunc();
  const facilitiesQuery = useQuery(System.facilitiesQueryOptions);
  const allDictionaries = useAllDictionaries();
  const facilityName = useFacilityName();
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
        // The candidate "insert before" anchors: the positions ordered together with this one.
        const orderAnchors = () => {
          const dict = dictionary();
          if (!dict) {
            return [];
          }
          const facilityId = (props.facilityMode ? activeFacilityId() : form.data("facilityId")) || undefined;
          return reorderablePositions(
            dict,
            facilityId ? {scopeFacilityId: facilityId} : {scopeFacilityId: undefined, globalOnly: true},
          );
        };
        // Deselect an anchor that fell out of the set, e.g. after a facility change.
        createComputed(() => {
          const anchorId = form.data("defaultOrder");
          const anchors = orderAnchors();
          if (anchorId && anchors.length && !anchors.some((position) => position.id === anchorId)) {
            form.setFields("defaultOrder", "");
          }
        });
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
                minRequirementLevel={attributesEditable() ? "optional" : "recommended"}
                nestFieldsUnder="position"
                selection={{model: "position", includeFixed: true}}
                requirementLevelOverride={positionFormRequirementLevel(dictionary())}
                editMode={attributesEditable()}
              />
              <Select
                name="defaultOrder"
                items={orderAnchors().map((position) => {
                  const edited = position.id === props.editedId;
                  // The facility rows appear only among a global dictionary's positions; a facility
                  // dictionary's rows all belong to its facility, so there is nothing to tell apart.
                  const details = dictionary()?.resource.facilityId
                    ? undefined
                    : facilityName(position.resource.facilityId);
                  return {
                    value: position.id,
                    text: [position.label, details].filter(Boolean).join(" "),
                    label: () => (
                      <OrderItemRow
                        label={
                          <PositionOrderLabel position={position}>
                            {edited ? ` ${t("parenthesised", {text: t("forms.reorder.this_element")})}` : ""}
                          </PositionOrderLabel>
                        }
                        details={details}
                      />
                    ),
                    disabled: edited,
                  };
                })}
                nullable
                placeholder={t("forms.reorder.at_end")}
              />
            </div>
            <FelteSubmit cancel={props.onCancel} />
          </>
        );
      }}
    </FelteForm>
  );
};
