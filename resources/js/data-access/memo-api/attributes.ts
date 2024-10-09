import {LangFunc, NON_NULLABLE} from "components/utils";
import {FacilityIdOrGlobal} from "state/activeFacilityId.state";
import {Attributable, getAttributeModel, makeAttributable, readAttribute} from "./attributable";
import {Dictionaries, Dictionary, dictionaryNameTranslationKey} from "./dictionaries";
import {
  AttributeMetadataResource,
  AttributeModel,
  AttributeResource,
  AttributeType,
  DictAttributeType,
  REQUIREMENT_LEVELS,
  RequirementLevel,
  SeparatorAttributeType,
  SimpleAttributeType,
} from "./resources/attribute.resource";
import {getNameTranslation, isNameTranslatable} from "./resources/name_string";
import {facilityIdMatches} from "./utils";

export class Attributes {
  constructor(
    /** A map of all the attributes by id. */
    readonly byId: ReadonlyMap<string, Attribute>,
    /** A map from model to a map from apiName to the attribute, ordered. */
    readonly byModelAndApiName: ReadonlyMap<string, ReadonlyMap<string, Attribute>>,
  ) {}

  static readonly EMPTY = new Attributes(new Map(), new Map());

  static fromResources(t: LangFunc, dictionaries: Dictionaries, resources: AttributeResource[]) {
    return Attributes.fromAttributes(resources.map((resource) => Attribute.fromResource(t, dictionaries, resource)));
  }

  private static fromAttributes(attributes: Attribute[]) {
    const byId = new Map<string, Attribute>();
    const byModelAndApiName = new Map<string, Map<string, Attribute>>();
    for (const attribute of attributes) {
      byId.set(attribute.id, attribute);
      let byApiName = byModelAndApiName.get(attribute.model);
      if (!byApiName) {
        byApiName = new Map<string, Attribute>();
        byModelAndApiName.set(attribute.model, byApiName);
      }
      byApiName.set(attribute.apiName, attribute);
    }
    return new Attributes(byId, byModelAndApiName);
  }

  [Symbol.iterator]() {
    return this.byId.values();
  }

  getById<T = unknown>(id: string) {
    const attribute = this.byId.get(id);
    if (!attribute) {
      throw new Error(`Attribute ${id} not found.`);
    }
    return attribute as Attribute<T>;
  }

  getByName<T = unknown>(model: string, apiName: string, {allowNonFixed = false} = {}) {
    const attribute = this.byModelAndApiName.get(model)?.get(apiName);
    if (!attribute) {
      throw new Error(`Attribute ${apiName} for model ${model} not found.`);
    }
    if (!allowNonFixed && !attribute.isFixed) {
      throw new Error(`Attribute ${apiName} for model ${model} is not fixed.`);
    }
    return attribute as Attribute<T>;
  }

  /** Returns the attributes for the specified model, or empty array. */
  getForModel(model: string) {
    return [...(this.byModelAndApiName.get(model)?.values() || [])];
  }

  /** Returns a subset of the attributes accessible for the specified facility, or for the global scope. */
  subsetFor(facilityIdOrGlobal: FacilityIdOrGlobal) {
    return Attributes.fromAttributes(
      [...this].filter((attribute) => facilityIdMatches(attribute.resource.facilityId, facilityIdOrGlobal)),
    );
  }

  read<T = unknown>(object: Attributable, attributeId: string) {
    return this.getById<T>(attributeId).readFrom(object);
  }

  readAll(object: Attributable) {
    return getAttributeModel(object).flatMap((model) =>
      this.getForModel(model).map((attribute) => ({
        model,
        attribute,
        value: attribute.readFrom(object),
      })),
    );
  }
}

export class Attribute<T = unknown> {
  readonly resource;

  private constructor(
    resource: AttributeResource,
    readonly id: string,
    readonly name: string,
    readonly description: string | undefined,
    readonly model: string,
    readonly isTranslatable: boolean,
    /** The translated name of the attribute. */
    readonly label: string,
    readonly apiName: string,
    readonly type: AttributeType,
    readonly metadata: AttributeMetadataResource,
    readonly basicType: SimpleAttributeType | DictAttributeType | SeparatorAttributeType | undefined,
    readonly typeModel: AttributeModel | undefined,
    readonly dictionary: Dictionary | undefined,
    readonly multiple: boolean | undefined,
    readonly requirementLevel: RequirementLevel,
    readonly isFixed: boolean,
  ) {
    this.resource = makeAttributable(resource, "attribute");
  }

  static fromResource(t: LangFunc, dictionaries: Dictionaries, resource: AttributeResource) {
    return new Attribute(
      resource,
      resource.id,
      resource.name,
      resource.description ||
        (isNameTranslatable(resource.name)
          ? t(
              [
                `attributes.attributes.${resource.model}.${resource.name}.desc`,
                `attributes.attributes.generic.${resource.name}.desc`,
              ],
              {defaultValue: ""},
            ) || undefined
          : undefined),
      resource.model,
      isNameTranslatable(resource.name),
      getNameTranslation(t, resource.name, (n) => {
        if (!resource.isFixed) {
          console.error(`Translatable non-fixed attribute ${resource.model}.${n}`);
          return `???.${n}`;
        }
        return [
          `attributes.attributes.${resource.model}.${n}`,
          `attributes.attributes.generic.${n}`,
          `models.${resource.model}.${resource.apiName}`,
          `models.generic.${resource.apiName}`,
          resource.dictionaryId
            ? dictionaryNameTranslationKey(dictionaries.get(resource.dictionaryId).name)
            : undefined,
        ].filter(NON_NULLABLE);
      }),
      resource.apiName,
      resource.type,
      resource.metadata || {},
      resource.typeModel
        ? undefined
        : (resource.type as SimpleAttributeType | DictAttributeType | SeparatorAttributeType),
      resource.typeModel || undefined,
      resource.dictionaryId ? dictionaries.get(resource.dictionaryId) : undefined,
      resource.isMultiValue ?? undefined,
      resource.requirementLevel,
      resource.isFixed,
    );
  }

  /**
   * Reads the attribute value from the attributable object.
   *
   * The caller must ensure that the output-only generic T must be correct for this attribute,
   * this is not checked in any way.
   */
  readFrom(object: Attributable) {
    if (!getAttributeModel(object).includes(this.model)) {
      throw new Error(
        `Trying to read attribute ${this.apiName} for model ${this.model} from an object ` +
          `representing models ${getAttributeModel(object).join(", ")}.`,
      );
    }
    return readAttribute<T>(object, this.apiName);
  }
}

export function compareRequirementLevels(a: RequirementLevel, b: RequirementLevel) {
  return REQUIREMENT_LEVELS.indexOf(a) - REQUIREMENT_LEVELS.indexOf(b);
}
