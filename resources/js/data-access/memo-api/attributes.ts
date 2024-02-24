import {createQuery} from "@tanstack/solid-query";
import {LangFunc, NON_NULLABLE, useLangFunc} from "components/utils";
import {createCached} from "components/utils/cache";
import {translationsLoaded} from "i18n_loader";
import {createMemo} from "solid-js";
import {FacilityIdOrGlobal, activeFacilityId} from "state/activeFacilityId.state";
import {Attributable, getAttributeModel, makeAttributable, readAttribute} from "./attributable";
import {Dictionaries, useAllDictionaries} from "./dictionaries";
import {System} from "./groups";
import {AttributeModel, AttributeResource, AttributeType, RequirementLevel} from "./resources/attribute.resource";
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

  static fromResources(t: LangFunc, dictionaries: Dictionaries, resources: AttributeResource[]) {
    return Attributes.fromAttributes(resources.map((resource) => Attribute.fromResource(t, dictionaries, resource)));
  }

  private static fromAttributes(attributes: Attribute[]) {
    const byId = new Map<string, Attribute>();
    const byName = new Map<string, Attribute>();
    const byModel = new Map<string, Attribute[]>();
    for (const attribute of attributes) {
      byId.set(attribute.id, attribute);
      if (attribute.resource.isFixed && attribute.isTranslatable) {
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
    readonly typeModel: AttributeModel | undefined,
    readonly dictionaryId: string | undefined,
    readonly multiple: boolean | undefined,
    readonly requirementLevel: RequirementLevel,
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
            `attributes.${resource.model}.${n}`,
            resource.isFixed ? `models.${resource.model}.${resource.apiName}` : undefined,
          ].filter(NON_NULLABLE),
        resource.dictionaryId ? {defaultValue: dictionaries.get(resource.dictionaryId).label} : undefined,
      ),
      resource.apiName,
      resource.type,
      resource.typeModel || undefined,
      resource.dictionaryId || undefined,
      resource.isMultiValue ?? undefined,
      resource.requirementLevel,
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

/** Returns an Attributes object containing all the attributes in the system. */
export const useAllAttributes = createCached(() => {
  const t = useLangFunc();
  const dictionaries = useAllDictionaries();
  const query = createQuery(System.attributesQueryOptions);
  const allAttributes = createMemo(() => {
    const dicts = dictionaries();
    if (!query.isSuccess || !dicts) {
      return undefined;
    }
    // Make sure the translations are loaded. Here it is critical because the created Attributes objects
    // are not reactive and will not update later.
    if (!translationsLoaded()) {
      return undefined;
    }
    return Attributes.fromResources(t, dicts, query.data);
  });
  return allAttributes;
});

/**
 * Returns an Attributes object with the dictionaries available in the current facility, or global
 * if there is no current facility.
 */
export function useAttributes() {
  const allAttributes = useAllAttributes();
  const attributes = createMemo(() => allAttributes()?.subsetFor(activeFacilityId()));
  return attributes;
}
