import {useFormContext} from "components/felte-form/FelteForm";
import {cx, useLangFunc} from "components/utils";
import {Attribute, compareRequirementLevels} from "data-access/memo-api/attributes";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {RequirementLevel, SimpleAttributeType} from "data-access/memo-api/resources/attribute.resource";
import {For, Match, ParentComponent, Show, Switch, VoidComponent, createMemo} from "solid-js";
import {Dynamic} from "solid-js/web";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";
import {Capitalize} from "../Capitalize";
import {HideableSection} from "../HideableSection";
import {SmallSpinner} from "../Spinner";
import {CheckboxField} from "./CheckboxField";
import {DictionarySelect} from "./DictionarySelect";
import {MultilineTextField} from "./MultilineTextField";
import {TQuerySelect} from "./TQuerySelect";
import {TextField} from "./TextField";
import {SimpleMultiField} from "./multi_fields";

export type AttributesType = Record<string, unknown>;
export const ATTRIBUTES_SCHEMA = z.record(z.unknown());

interface Props {
  readonly model: string;
  readonly minRequirementLevel?: RequirementLevel;
  readonly nestFieldsUnder?: string;
  readonly wrapIn?: ParentComponent;
}

/** Displays a form part with attributes of a model. */
export const AttributeFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const {form} = useFormContext();

  function fieldName(attribute: Attribute) {
    return props.nestFieldsUnder ? `${props.nestFieldsUnder}.${attribute.apiName}` : attribute.apiName;
  }

  const AttributeField: VoidComponent<{readonly attribute: Attribute}> = (aProps) => {
    const field = () => {
      const name = () => fieldName(aProps.attribute);
      const value = () => form.data(name());
      const nullable = compareRequirementLevels(aProps.attribute.requirementLevel, "required") < 0;

      function simpleAttributeField(type: SimpleAttributeType, fieldName = name()) {
        switch (type) {
          case "string":
            return <TextField name={fieldName} label="" small />;
          case "text":
            return <MultilineTextField name={fieldName} label="" small />;
          case "int":
            return <TextField name={fieldName} type="number" label="" small />;
          case "bool":
            return (
              <div class="self-start">
                <CheckboxField name={fieldName} label="" />
              </div>
            );
          case "date":
            return (
              <TextField
                name={fieldName}
                type="date"
                label=""
                class={cx("text-black", value() ? undefined : "text-opacity-50")}
                small
              />
            );
          case "datetime":
            // TODO: Implement. Cannot use datetime-local because this needs to use UTC.
            return undefined;
          default:
            return type satisfies never;
        }
      }

      function modelAttributeField(attribute: Attribute) {
        const extraSelectProps = {
          name: name(),
          label: "",
          multiple: !!attribute.multiple,
          nullable: !attribute.multiple && nullable,
          small: true,
        };
        switch (attribute.typeModel) {
          case "user/staff":
            return (
              <Show when={activeFacilityId()} fallback={<SmallSpinner />}>
                <TQuerySelect
                  querySpec={{
                    entityURL: `facility/${activeFacilityId()}/user/staff`,
                    prefixQueryKey: [FacilityStaff.keys.staff()],
                  }}
                  {...extraSelectProps}
                />
              </Show>
            );
          case "user/client":
            return (
              <Show when={activeFacilityId()} fallback={<SmallSpinner />}>
                <TQuerySelect
                  querySpec={{
                    entityURL: `facility/${activeFacilityId()}/user/client`,
                    prefixQueryKey: [FacilityClient.keys.client()],
                  }}
                  {...extraSelectProps}
                />
              </Show>
            );
        }
      }

      if (!aProps.attribute.basicType) {
        return modelAttributeField(aProps.attribute);
      }
      if (aProps.attribute.multiple)
        switch (aProps.attribute.basicType) {
          case "bool":
            throw new Error(`Unsupported multiple attribute of type ${aProps.attribute.basicType}`);
          case "string":
          case "text":
          case "int":
          case "date":
          case "datetime": {
            const {basicType} = aProps.attribute;
            return (
              <SimpleMultiField
                name={name()}
                primitiveType
                addAtEndValue={() => ""}
                field={(name) => simpleAttributeField(basicType, name)}
              />
            );
          }
          case "dict":
            return (
              <DictionarySelect name={name()} label="" dictionary={aProps.attribute.dictionary!.id} multiple small />
            );
          default:
            return aProps.attribute.basicType satisfies never;
        }
      else
        switch (aProps.attribute.basicType) {
          case "string":
          case "text":
          case "int":
          case "bool":
          case "date":
          case "datetime":
            return simpleAttributeField(aProps.attribute.basicType);
          case "dict":
            return (
              <DictionarySelect
                name={name()}
                label=""
                dictionary={aProps.attribute.dictionary!.id}
                nullable={nullable}
                small
              />
            );
          default:
            return aProps.attribute.basicType satisfies never;
        }
    };
    return <>{field()}</>;
  };

  const nonFixedAttributes = createMemo(() =>
    attributes()
      ?.getForModel(props.model)
      .filter(({isFixed}) => !isFixed),
  );

  const Content: VoidComponent = () => (
    <fieldset data-felte-keep-on-remove>
      <div class="grid gap-x-1" style={{"grid-template-columns": "fit-content(50%) auto 1fr"}}>
        {/* Loop over ids to keep the identity of items. */}
        <For each={nonFixedAttributes()?.map(({id}) => id)} fallback={t("attributes.no_attributes")}>
          {(attributeId) => {
            const attribute = attributes()!.get(attributeId);
            const isEmpty = () => {
              const value = form.data(fieldName(attribute));
              return value == undefined || value == "";
            };
            return (
              <HideableSection
                show={
                  !isEmpty() ||
                  !props.minRequirementLevel ||
                  compareRequirementLevels(attribute.requirementLevel, props.minRequirementLevel) >= 0
                }
                class="col-span-full grid grid-cols-subgrid"
              >
                <div class="col-span-full min-h-small-input grid grid-cols-subgrid grid-flow-col py-0.5 border-b border-gray-300 border-dotted">
                  <label
                    class="font-medium flex items-center wrapTextAnywhere"
                    for={attribute.multiple && attribute.basicType !== "dict" ? undefined : fieldName(attribute)}
                  >
                    <Capitalize text={attribute.label} />
                  </label>
                  <div class="flex items-center justify-center text-grey-text">
                    <RequirementLevelMarker level={attribute.requirementLevel} />
                  </div>
                  <div class="flex flex-col justify-center">
                    <AttributeField attribute={attribute} />
                  </div>
                </div>
              </HideableSection>
            );
          }}
        </For>
      </div>
    </fieldset>
  );

  return (
    <Show when={props.wrapIn} fallback={<Content />}>
      {(wrapIn) => (
        <Dynamic component={wrapIn()}>
          <Content />
        </Dynamic>
      )}
    </Show>
  );
};

interface RequirementLevelProps {
  readonly level: RequirementLevel;
}

export const RequirementLevelMarker: VoidComponent<RequirementLevelProps> = (props) => {
  const t = useLangFunc();
  return (
    <span class="text-sm" title={t(`attributes.requirement_level.${props.level}`)}>
      <Switch>
        <Match when={props.level === "empty"}>⛌</Match>
        <Match when={props.level === "optional"}>?</Match>
        <Match when={props.level === "recommended"}>✤</Match>
        <Match when={props.level === "required"}>🞴</Match>
      </Switch>
    </span>
  );
};
