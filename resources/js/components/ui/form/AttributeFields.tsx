import {useFormContext} from "components/felte-form/FelteForm";
import {recursiveUnwrapFormValues} from "components/felte-form/wrapped_fields";
import {DATE_FORMAT, DATE_TIME_FORMAT, NON_NULLABLE, cx, htmlAttributes, useLangFunc} from "components/utils";
import {
  PartialAttributesSelection,
  attributesSelectionFromPartial,
  getUnknownFixedAttributes,
  isAttributeSelected,
} from "components/utils/attributes_selection";
import {isDEV} from "components/utils/dev_mode";
import {useModelQuerySpecs} from "components/utils/model_query_specs";
import {Attribute, compareRequirementLevels} from "data-access/memo-api/attributes";
import {useAttributes, useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {
  DictAttributeType,
  RequirementLevel,
  SimpleAttributeType,
} from "data-access/memo-api/resources/attribute.resource";
import {UserLink} from "features/facility-users/UserLink";
import {DateTime} from "luxon";
import {
  Accessor,
  For,
  JSX,
  Match,
  ParentComponent,
  Show,
  Switch,
  VoidComponent,
  createEffect,
  createMemo,
  createSignal,
} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {z} from "zod";
import {Capitalize} from "../Capitalize";
import {HideableSection} from "../HideableSection";
import {InfoIcon} from "../InfoIcon";
import {SectionWithHeader} from "../SectionWithHeader";
import {SmallSpinner} from "../Spinner";
import {ThingsList} from "../ThingsList";
import {CHECKBOX, EmptyValueSymbol} from "../symbols";
import {title} from "../title";
import {CheckboxField} from "./CheckboxField";
import {DictionarySelect} from "./DictionarySelect";
import {MultilineTextField} from "./MultilineTextField";
import {TQuerySelect} from "./TQuerySelect";
import {TextField} from "./TextField";
import {SimpleMultiField} from "./multi_fields";

const _DIRECTIVES_ = null && title;

export type AttributesType = Record<string, unknown>;
export const ATTRIBUTES_SCHEMA = z.record(z.unknown());

interface Props {
  readonly model: string;
  // The override type must match the attribute type.
  readonly selection: PartialAttributesSelection<AttributeParams<unknown>>;
  readonly minRequirementLevel?: RequirementLevel;
  readonly nestFieldsUnder?: string;
  readonly editMode: boolean;
}

export interface AttributeParams<V> {
  readonly isEmpty?: (formValue: V) => boolean;
  readonly view?: (formValue: Accessor<V>) => JSX.Element;
  readonly viewEmpty?: () => JSX.Element;
}

/**
 * Displays a form part with attributes of a model.
 *
 * Displays the non-fixed attributes, plus the attributes specified by includeFixedAttributes.
 */
export const AttributeFields: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const attributes = useAttributes();
  const modelQuerySpecs = useModelQuerySpecs();
  const {form} = useFormContext();

  function fieldName(attribute: Attribute) {
    return props.nestFieldsUnder ? `${props.nestFieldsUnder}.${attribute.apiName}` : attribute.apiName;
  }

  const AttributeField: VoidComponent<{readonly attribute: Attribute}> = (aProps) => {
    const name = () => fieldName(aProps.attribute);
    const value = () => form.data(name());
    const field = () => {
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
                <TQuerySelect
                  {...modelQuerySpecs.userClient({showBirthDateWhenSelected: true})}
                  {...extraSelectProps}
                />
              </Show>
            );
          default:
            return undefined;
        }
      }

      if (aProps.attribute.basicType === "separator") {
        throw new Error(`Unsupported separator attribute ${aProps.attribute.id}`);
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

  interface AttributeViewProps {
    readonly attribute: Attribute;
    readonly params?: AttributeParams<unknown>;
  }

  const AttributeView: VoidComponent<AttributeViewProps> = (aProps) => {
    const name = () => fieldName(aProps.attribute);
    const value = createMemo(() => recursiveUnwrapFormValues(form.data(name())));
    const hasValue = () => {
      const v = value();
      if (aProps.params?.isEmpty) {
        return !aProps.params.isEmpty(v);
      }
      return v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
    };
    const DefaultViewer: ParentComponent<htmlAttributes.div> = (props) => (
      <div {...htmlAttributes.merge(props, {class: "overflow-y-auto max-h-32 whitespace-pre-wrap"})} />
    );
    const defaultView = () => {
      function simpleAttributeView(type: SimpleAttributeType | DictAttributeType, val = value()) {
        switch (type) {
          case "string":
          case "text":
          case "int":
            return String(val);
          case "bool":
            return val === true ? t("bool_values.yes") : t("bool_values.no");
          case "date":
            return DateTime.fromISO(val as string).toLocaleString({...DATE_FORMAT, weekday: "long"});
          case "datetime":
            return DateTime.fromISO(val as string).toLocaleString({...DATE_TIME_FORMAT, weekday: "long"});
          case "dict":
            return dictionaries()?.getPositionById(val as string)?.label;
          default:
            return type satisfies never;
        }
      }

      function modelAttributeView(attribute: Attribute) {
        switch (attribute.typeModel) {
          case "user/staff":
            return <UserLink type="staff" userId={value() as string} />;
          case "user/client":
            return <UserLink type="clients" userId={value() as string} />;
        }
      }

      const {basicType} = aProps.attribute;
      if (basicType === "separator") {
        throw new Error(`Unsupported separator attribute ${aProps.attribute.id}`);
      }
      if (!basicType) {
        return modelAttributeView(aProps.attribute);
      }
      if (aProps.attribute.multiple) {
        const values = () => value() as unknown[];
        switch (basicType) {
          case "bool":
          case "date":
          case "datetime":
          case "dict":
          case "int":
          case "string":
          case "text":
            return (
              <DefaultViewer>
                <ThingsList things={values()} map={(v) => simpleAttributeView(basicType, v)} />
              </DefaultViewer>
            );
          default:
            return basicType satisfies never;
        }
      } else {
        return <DefaultViewer>{simpleAttributeView(basicType)}</DefaultViewer>;
      }
    };
    return (
      <div class="overflow-clip px-1">
        <Switch>
          <Match when={!hasValue()}>
            <Show when={aProps.params?.viewEmpty} fallback={<EmptyValueSymbol />}>
              {(viewEmpty) => viewEmpty()()}
            </Show>
          </Match>
          <Match when={aProps.params?.view}>{(view) => view()(value)}</Match>
          <Match when="fallback">{defaultView()}</Match>
        </Switch>
      </div>
    );
  };

  const selection = createMemo(() => attributesSelectionFromPartial(props.selection));
  createEffect(() => {
    if (!attributes()) {
      return;
    }
    const unknownFixedAttributes = getUnknownFixedAttributes(selection(), attributes()!.getForModel(props.model));
    if (unknownFixedAttributes) {
      console.error(
        `Unknown fixed attributes specified for model ${props.model}: ${unknownFixedAttributes.join(", ")}`,
      );
    }
  });
  const relevantAttributes = createMemo(
    () =>
      new Map(
        attributes()
          ?.getForModel(props.model)
          .map((attribute) => {
            const selected =
              attribute.type === "separator"
                ? {selected: true, override: undefined}
                : isAttributeSelected(selection(), attribute);
            return selected && ([attribute.id, {attribute, selected}] as const);
          })
          .filter(NON_NULLABLE),
      ),
  );
  interface AttributesGroup {
    readonly separatorBeforeId?: string;
    readonly attributeIds: string[];
  }
  const attributeGroups = createMemo(() => {
    const groups: AttributesGroup[] = [];
    let group: AttributesGroup | undefined;
    for (const {attribute} of relevantAttributes().values()) {
      if (attribute.type === "separator") {
        group = {separatorBeforeId: attribute.id, attributeIds: []};
        groups.push(group);
      } else {
        if (!group) {
          group = {attributeIds: []};
          groups.push(group);
        }
        group.attributeIds.push(attribute.id);
      }
    }
    return groups.filter((g) => g.attributeIds.length);
  });

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
        <div class="grid gap-x-1" style={{"grid-template-columns": "1fr 2fr auto"}}>
          <For each={attributeGroups()} fallback={t("attributes.no_attributes")}>
            {(group) => (
              <SectionWithHeader
                header={(show) => (
                  <Show when={group.separatorBeforeId}>
                    {(separatorBeforeId) => (
                      <HideableSection
                        class="col-span-full"
                        show={show()}
                        transitionTimeMs={50}
                        transitionTimingFunction="ease-out"
                      >
                        <div class="font-bold pt-6">
                          <Capitalize text={relevantAttributes().get(separatorBeforeId())?.attribute.label} />
                        </div>
                      </HideableSection>
                    )}
                  </Show>
                )}
                footer={(show) => (
                  <Show when={show()}>
                    <div class="col-span-full -mt-px border-b border-memo-active" />
                  </Show>
                )}
                class="col-span-full grid grid-cols-subgrid"
              >
                <For each={group.attributeIds}>
                  {(attributeId) => {
                    const {attribute, selected} = relevantAttributes()!.get(attributeId)!;
                    const isEmpty = () => {
                      const value = form.data(fieldName(attribute));
                      return selected.override?.isEmpty
                        ? selected.override.isEmpty(value)
                        : value == undefined || value == "";
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
                            class="font-semibold flex items-center gap-1"
                            for={
                              attribute.multiple && attribute.basicType !== "dict" ? undefined : fieldName(attribute)
                            }
                          >
                            <div class="wrapTextAnywhere">
                              <Capitalize text={attribute.label} />
                            </div>
                            <Show when={attribute.description}>
                              {(description) => <InfoIcon title={description()} />}
                            </Show>
                          </label>
                          <div class="flex flex-col justify-center">
                            <Show
                              when={props.editMode}
                              fallback={<AttributeView attribute={attribute} params={selected.override} />}
                            >
                              <AttributeField attribute={attribute} />
                            </Show>
                          </div>
                          <div class="flex items-center justify-center">
                            <RequirementLevelMarker level={attribute.requirementLevel} isEmpty={isEmpty()} />
                          </div>
                        </div>
                      </HideableSection>
                    );
                  }}
                </For>
              </SectionWithHeader>
            )}
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
    <div
      class="w-full flex flex-col items-center"
      use:title={[t(`attributes.requirement_level.${props.level}`), {placement: "right"}]}
    >
      <span class="text-sm text-grey-text select-none">
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
    </div>
  );
};
