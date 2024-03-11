import {LangFunc, NON_NULLABLE} from "components/utils";
import {FacilityIdOrGlobal} from "state/activeFacilityId.state";
import {Attributable, getAttributeModel, makeAttributable, readAttribute} from "./attributable";
import {Dictionaries, Dictionary} from "./dictionaries";
import {
  AttributeModel,
  AttributeResource,
  AttributeType,
  DictAttributeType,
  REQUIREMENT_LEVELS,
  RequirementLevel,
  SimpleAttributeType,
} from "./resources/attribute.resource";
import {getNameTranslation, isNameTranslatable} from "./resources/name_string";
import {facilityIdMatches} from "./utils";

export class Attributes {
  constructor(
    /** A map of all the attributes by id. */
    readonly byId: ReadonlyMap<string, Attribute>,
    readonly byName: ReadonlyMap<string, Attribute>,
    /** A map from model name to a list of its attributes, ordered. */
    readonly byModel: ReadonlyMap<string, Attribute[]>,
  ) {}

  static readonly EMPTY = new Attributes(new Map(), new Map(), new Map());

  static fromResources(t: LangFunc, dictionaries: Dictionaries, resources: AttributeResource[]) {
    return Attributes.fromAttributes(resources.map((resource) => Attribute.fromResource(t, dictionaries, resource)));
  }

  private static fromAttributes(attributes: Attribute[]) {
    const byId = new Map<string, Attribute>();
    const byName = new Map<string, Attribute>();
    const byModel = new Map<string, Attribute[]>();
    for (const attribute of attributes) {
      byId.set(attribute.id, attribute);
      if (attribute.isFixed && attribute.isTranslatable) {
        byName.set(attribute.name, attribute);
      }
      const model = attribute.model;
      let modelAttributes = byModel.get(model);
      if (!modelAttributes) {
        modelAttributes = [];
        byModel.set(model, modelAttributes);
      }
      modelAttributes.push(attribute);
    }
    return new Attributes(byId, byName, byModel);
  }

  [Symbol.iterator]() {
    return this.byId.values();
  }

  get<T = unknown>(idOrName: string) {
    const attribute = this.byId.get(idOrName) || this.byName.get(idOrName);
    if (!attribute) {
      throw new Error(`Attribute ${idOrName} not found.`);
    }
    return attribute as Attribute<T>;
  }

  /** Returns the attributes for the specified model, or empty array. */
  getForModel(model: string) {
    return this.byModel.get(model) || [];
  }

  /** Returns a subset of the attributes accessible for the specified facility, or for the global scope. */
  subsetFor(facilityIdOrGlobal: FacilityIdOrGlobal) {
    return Attributes.fromAttributes(
      [...this].filter((attribute) => facilityIdMatches(attribute.resource.facilityId, facilityIdOrGlobal)),
    );
  }

  read<T = unknown>(object: Attributable, attributeId: string) {
    return this.get<T>(attributeId).readFrom(object);
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
    readonly model: string,
    readonly isTranslatable: boolean,
    /** The translated name of the attribute. */
    readonly label: string,
    readonly apiName: string,
    readonly type: AttributeType,
    readonly basicType: SimpleAttributeType | DictAttributeType | undefined,
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
      resource.model,
      isNameTranslatable(resource.name),
      getNameTranslation(
        t,
        resource.name,
        (n) =>
          [
            `attributes.attributes.${resource.model}.${n}`,
            `attributes.attributes.generic.${n}`,
            resource.isFixed ? `models.${resource.model}.${resource.apiName}` : undefined,
            `models.generic.${resource.apiName}`,
          ].filter(NON_NULLABLE),
        resource.dictionaryId ? {defaultValue: dictionaries.get(resource.dictionaryId).label} : undefined,
      ),
      resource.apiName,
      resource.type,
      resource.typeModel ? undefined : (resource.type as SimpleAttributeType | DictAttributeType),
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
        `Trying to read attribute ${this.id} for model ${this.model} from an object ` +
          `representing models ${getAttributeModel(object).join(", ")}.`,
      );
    }
    return readAttribute<T>(object, this.apiName);
  }
}

export function compareRequirementLevels(a: RequirementLevel, b: RequirementLevel) {
  return REQUIREMENT_LEVELS.indexOf(a) - REQUIREMENT_LEVELS.indexOf(b);
}
