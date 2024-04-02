import {useFormContext} from "components/felte-form/FelteForm";
import {cx, useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {Attribute, compareRequirementLevels} from "data-access/memo-api/attributes";
import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {RequirementLevel, SimpleAttributeType} from "data-access/memo-api/resources/attribute.resource";
import {For, Match, Show, Switch, VoidComponent, createEffect, createMemo, createSignal} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";
import {Capitalize} from "../Capitalize";
import {HideableSection} from "../HideableSection";
import {SmallSpinner} from "../Spinner";
import {CHECKBOX} from "../symbols";
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
  /**
   * Whether to include the fixed attributes in the component. Can specify a list of apiName's of the
   * fixed attributes to include.
   */
  readonly includeFixedAttributes?: boolean | readonly string[];
  readonly minRequirementLevel?: RequirementLevel;
  readonly nestFieldsUnder?: string;
  readonly editMode: boolean;
}

/**
 * Displays a form part with attributes of a model.
 *
 * Displays the non-fixed attributes, plus the attributes specified by includeFixedAttributes.
 */
export const AttributeFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const attributes = useAttributes();
  const modelQuerySpecs = useModelQuerySpecs();
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
                <TQuerySelect {...modelQuerySpecs.userStaff()} {...extraSelectProps} />
              </Show>
            );
          case "user/client":
            return (
              <Show when={activeFacilityId()} fallback={<SmallSpinner />}>
                <TQuerySelect {...modelQuerySpecs.userClient()} {...extraSelectProps} />
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

  createEffect(() => {
    if (!attributes() || !Array.isArray(props.includeFixedAttributes)) {
      return;
    }
    const unknownFixedAttributes = props.includeFixedAttributes.filter(
      (apiName) => !attributes()!.getByName(props.model, apiName),
    );
    if (unknownFixedAttributes.length) {
      console.error(
        `Unknown fixed attributes specified for model ${props.model}: ${unknownFixedAttributes.join(", ")}`,
      );
    }
  });
  const relevantAttributes = createMemo(() =>
    attributes()
      ?.getForModel(props.model)
      .filter(({isFixed, apiName}) => {
        if (isFixed) {
          return (
            props.includeFixedAttributes === true ||
            (Array.isArray(props.includeFixedAttributes) && props.includeFixedAttributes.includes(apiName))
          );
        } else {
          return true;
        }
      }),
  );

  const [showAllAttributes, setShowAllAttributes] = createSignal(false);
  const minRequirementLevel = () => (showAllAttributes() ? undefined : props.minRequirementLevel);

  return (
    <div class="flex flex-col items-stretch">
      <Show when={isDEV()}>
        <label class="flex items-baseline gap-1" onClick={() => setShowAllAttributes((v) => !v)}>
          {CHECKBOX(showAllAttributes())} <span class="text-xs">DEV</span> {t("attributes.show_all")}
        </label>
      </Show>
      <fieldset data-felte-keep-on-remove disabled={!props.editMode}>
        <div class="grid gap-x-1" style={{"grid-template-columns": "fit-content(50%) auto 1fr"}}>
          {/* Loop over ids to keep the identity of items. */}
          <For each={relevantAttributes()?.map(({id}) => id)} fallback={t("attributes.no_attributes")}>
            {(attributeId) => {
              const attribute = attributes()!.getById(attributeId);
              const isEmpty = () => {
                const value = form.data(fieldName(attribute));
                return value == undefined || value == "";
              };
              return (
                <HideableSection
                  show={
                    !isEmpty() ||
                    !minRequirementLevel() ||
                    compareRequirementLevels(attribute.requirementLevel, minRequirementLevel()!) >= 0
                  }
                  class="col-span-full grid grid-cols-subgrid"
                >
                  <div class="col-span-full grid grid-cols-subgrid grid-flow-col py-0.5 border-b border-gray-300 border-dotted">
                    <label
                      class="font-medium flex items-center wrapTextAnywhere"
                      for={attribute.multiple && attribute.basicType !== "dict" ? undefined : fieldName(attribute)}
                    >
                      <Capitalize text={attribute.label} />
                    </label>
                    <div class="flex items-center justify-center">
                      <RequirementLevelMarker level={attribute.requirementLevel} isEmpty={isEmpty()} />
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
    </div>
  );
};

interface RequirementLevelProps {
  readonly level: RequirementLevel;
  readonly isEmpty: boolean;
}

const WARN_COLOR_CLASS = "text-yellow-600";
const ERR_COLOR_CLASS = "text-red-700";

export const RequirementLevelMarker: VoidComponent<RequirementLevelProps> = (props) => {
  const t = useLangFunc();
  return (
    <span class="text-sm text-grey-text select-none" title={t(`attributes.requirement_level.${props.level}`)}>
      <Switch>
        <Match when={props.level === "empty"}>
          <span class={props.isEmpty ? undefined : WARN_COLOR_CLASS}>⛌</span>
        </Match>
        <Match when={props.level === "optional"}>?</Match>
        <Match when={props.level === "recommended"}>
          <span class={props.isEmpty ? WARN_COLOR_CLASS : undefined}>✤</span>
        </Match>
        <Match when={props.level === "required"}>
          <span class={props.isEmpty ? ERR_COLOR_CLASS : undefined}>🞴</span>
        </Match>
      </Switch>
    </span>
  );
};
