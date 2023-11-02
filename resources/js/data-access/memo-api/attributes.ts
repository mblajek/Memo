import {createQuery} from "@tanstack/solid-query";
import {LangPrefixFunc, NON_NULLABLE, useLangFunc} from "components/utils";
import {translationsLoaded} from "i18n_loader";
import {createMemo} from "solid-js";
import {FacilityIdOrGlobal, activeFacilityId} from "state/activeFacilityId.state";
import {Dictionaries, Dictionary, useAllDictionaries} from "./dictionaries";
import {System} from "./groups";
import {AttributeResource, AttributeType} from "./resources/attribute.resource";
import {getNameTranslation} from "./resources/name_string";
import {facilityIdMatches} from "./utils";

export class Attributes {
  constructor(
    /** A map of all the attributes by id. */
    readonly byId: ReadonlyMap<string, Attribute>,
    /** A map from model name to a list of its attributes, ordered. */
    readonly byModel: ReadonlyMap<string, Attribute[]>,
  ) {}

  static fromResources(t: LangPrefixFunc, resources: AttributeResource[], dictionaries: Dictionaries) {
    return Attributes.fromAttributes(resources.map((resource) => Attribute.fromResource(t, resource, dictionaries)));
  }

  private static fromAttributes(attributes: Attribute[]) {
    const byId = new Map<string, Attribute>();
    const byModel = new Map<string, Attribute[]>();
    for (const attribute of attributes) {
      byId.set(attribute.id, attribute);
      const model = attribute.model;
      let modelAttributes = byModel.get(model);
      if (!modelAttributes) {
        modelAttributes = [];
        byModel.set(model, modelAttributes);
      }
      modelAttributes.push(attribute);
    }
    return new Attributes(byId, byModel);
  }

  get(id: string) {
    const attribute = this.byId.get(id);
    if (!attribute) {
      throw new Error(`Attribute ${id} not found.`);
    }
    return attribute;
  }

  /** Returns the attributes for the specified model, or empty array. */
  getForModel(model: string) {
    return this.byModel.get(model) || [];
  }

  /** Returns a subset of the attributes accessible for the specified facility, or for the global scope. */
  subsetFor(facilityIdOrGlobal: FacilityIdOrGlobal) {
    return Attributes.fromAttributes(
      Array.from(this.byId.values(), (attribute) => attribute.subsetFor(facilityIdOrGlobal)).filter(NON_NULLABLE),
    );
  }
}

export class Attribute {
  private constructor(
    readonly resource: AttributeResource,
    readonly id: string,
    readonly model: string,
    /** The translated name of the attribute. */
    readonly label: string,
    readonly apiName: string,
    readonly type: AttributeType,
    readonly dictionary: Dictionary | undefined,
    readonly multiple: boolean | undefined,
  ) {}

  static fromResource(t: LangPrefixFunc, resource: AttributeResource, dictionaries: Dictionaries) {
    return new Attribute(
      resource,
      resource.id,
      resource.model,
      getNameTranslation(resource.name, (n) => t(`models.${resource.model}.${n}`)),
      resource.apiName,
      resource.type,
      resource.dictionaryId ? dictionaries.get(resource.dictionaryId) : undefined,
      resource.isMultiValue ?? undefined,
    );
  }

  /** Returns a subset of the attribute accessible for the specified facility, or for the global scope. */
  subsetFor(facilityIdOrGlobal: FacilityIdOrGlobal) {
    if (!facilityIdMatches(this.resource.facilityId, facilityIdOrGlobal)) {
      return undefined;
    }
    return new Attribute(
      this.resource,
      this.id,
      this.model,
      this.label,
      this.apiName,
      this.type,
      this.dictionary?.subsetFor(facilityIdOrGlobal),
      this.multiple,
    );
  }
}

/**
 * A cache of the Attributes objects created from the backend's response. It is here to prevent
 * creating the Attributes object separately for every subscriber of the query.
 *
 * A simple createMemo approach will not work because a file-level memo is not allowed, and a
 * memo in useAttributes will run its code for each subscriber separately.
 */
const attributesMap = new WeakMap<AttributeResource[], Attributes>();

/** Returns an Attributes object containing all the attributes in the system. */
export function useAllAttributes() {
  const t = useLangFunc();
  const allDictionaries = useAllDictionaries();
  const query = createQuery(System.attributesQueryOptions);
  const allAttributes = createMemo(() => {
    if (!query.isSuccess) {
      return undefined;
    }
    const allDicts = allDictionaries();
    if (!allDicts) {
      return undefined;
    }
    const resources = query.data;
    let attributes = attributesMap.get(resources);
    if (attributes) {
      return attributes;
    }
    // Make sure the translations are loaded. Here it is critical because the created Attributes objects
    // are not reactive and will not update later.
    if (!translationsLoaded()) {
      return undefined;
    }
    attributes = Attributes.fromResources(t, resources, allDicts);
    attributesMap.set(resources, attributes);
    return attributes;
  });
  return allAttributes;
}

/**
 * Returns an Attributes object with the dictionaries available in the current facility, or global
 * if there is no current facility.
 */
export function useAttributes() {
  const allAttributes = useAllAttributes();
  const attributes = createMemo(() => allAttributes()?.subsetFor(activeFacilityId()));
  return attributes;
}
