import {createQuery} from "@tanstack/solid-query";
import {LangPrefixFunc, useLangFunc} from "components/utils";
import {translationsLoaded} from "i18n_loader";
import {createMemo} from "solid-js";
import {System} from "./groups";
import {DictionaryResource, PositionResource} from "./resources/dictionary.resource";

export class Dictionaries {
  constructor(
    /** A map of all the dictionaries by id. */
    readonly byId: ReadonlyMap<string, Dictionary>,
    /**
     * A map of the fixed dictionaries by name.
     * Contains only the dictionaries with a translatable name (not starting with `+`).
     */
    readonly byName: ReadonlyMap<string, Dictionary>,
  ) {}

  static fromResources(t: LangPrefixFunc, resources: DictionaryResource[]) {
    const byId = new Map<string, Dictionary>();
    const byName = new Map<string, Dictionary>();
    for (const resource of resources) {
      const dictionary = Dictionary.fromResource(t, resource);
      byId.set(dictionary.id, dictionary);
      if (dictionary.resource.isFixed && dictionary.isNameTranslatable) {
        byName.set(dictionary.resource.name, dictionary);
      }
    }
    return new Dictionaries(byId, byName);
  }

  /** Returns a dictionary by id, or a fixed dictionary by name. */
  get(idOrName: string) {
    return this.byId.get(idOrName) || this.byName.get(idOrName);
  }

  /** Returns a subset of the dictionaries (and positions) accessible for the specified facility. */
  subsetForFacility(facilityId: string) {
    return dictionariesSubsetFor(this, facilityId);
  }

  /** Returns a subset of the dictionaries (and positions) accessible outside of facility context. */
  subsetForGlobal() {
    return dictionariesSubsetFor(this, undefined);
  }
}

/** Returns a dictionaries subset for the facility, or for global uses if facility not specified. */
function dictionariesSubsetFor(dictionaries: Dictionaries, facilityId: string | undefined) {
  const byId = new Map<string, Dictionary>();
  const byName = new Map<string, Dictionary>();
  for (const dictionary of dictionaries.byId.values()) {
    const dictionarySubset = dictionarySubsetFor(dictionary, facilityId);
    if (dictionarySubset) {
      byId.set(dictionarySubset.id, dictionarySubset);
      if (dictionarySubset.resource.isFixed && dictionarySubset.isNameTranslatable) {
        byName.set(dictionarySubset.resource.name, dictionarySubset);
      }
    }
  }
  return new Dictionaries(byId, byName);
}

export class Dictionary {
  /** A list of non-disabled positions in the dictionary. */
  readonly activePositions;

  constructor(
    readonly resource: DictionaryResource,
    readonly id: string,
    readonly isNameTranslatable: boolean,
    /** The translated name of the dictionary. */
    readonly label: string,
    /** The list of all positions of the dictionary, including the disabled ones. */
    readonly allPositions: Position[],
  ) {
    this.activePositions = this.allPositions.filter((position) => !position.resource.isDisabled);
  }

  static fromResource(t: LangPrefixFunc, resource: DictionaryResource) {
    const isNameTranslatable = !resource.name.startsWith("+");
    return new Dictionary(
      resource,
      resource.id,
      isNameTranslatable,
      isNameTranslatable ? t(`dictionary.${resource.name}._name`) : resource.name.substring(1),
      resource.positions.map((position) => new Position(t, position, isNameTranslatable ? resource.name : undefined)),
    );
  }

  /**
   * Returns a dictionary with a subset of positions accessible for the specified facility.
   * If the whole dictionary is not accessible, returns undefined.
   */
  subsetForFacility(facilityId: string) {
    return dictionarySubsetFor(this, facilityId);
  }

  /**
   * Returns a dictionary with a subset of positions accessible outside of facility context.
   * If the whole dictionary is not accessible, returns undefined.
   */
  subsetForGlobal() {
    return dictionarySubsetFor(this, undefined);
  }
}

/** Returns a dictionary subset for the facility, or for global uses if facility not specified. */
function dictionarySubsetFor(dictionary: Dictionary, facilityId: string | undefined) {
  if (facilityIdMatches(dictionary.resource.facilityId, facilityId)) {
    const positionsSubset = dictionary.allPositions.filter((position) =>
      facilityIdMatches(position.resource.facilityId, facilityId),
    );
    if (positionsSubset.length === dictionary.allPositions.length) {
      return dictionary;
    }
    return new Dictionary(
      dictionary.resource,
      dictionary.id,
      dictionary.isNameTranslatable,
      dictionary.label,
      positionsSubset,
    );
  }
  return undefined;
}

function facilityIdMatches(dictFacilityId: string | null, matchFacilityId: string | undefined) {
  return dictFacilityId === null || dictFacilityId === matchFacilityId;
}

export class Position {
  readonly id;
  readonly label;
  readonly disabled;

  constructor(
    t: LangPrefixFunc,
    readonly resource: PositionResource,
    /** The name of the dictionary, if it's a translatable name. */
    readonly dictionaryTranslatableName: string | undefined,
  ) {
    this.id = resource.id;
    if (resource.name.startsWith("+")) {
      this.label = resource.name.substring(1);
    } else if (!dictionaryTranslatableName) {
      throw new Error(
        `Translatable position (${resource.id}: ${resource.name}) inside a dictionary with an untranslatable name.`,
      );
    } else {
      this.label = t(`dictionary.${dictionaryTranslatableName}.${resource.name}`);
    }
    this.disabled = resource.isDisabled;
  }
}

/**
 * A cache of the Dictionaries elements created from the backend's response. It is here to prevent
 * creating the Dictionaries object separately for every subscriber of the query.
 *
 * A simple createMemo approach will not work because a file-level memo is not allowed, and a
 * memo in useDictionaries will run its code for each subscriber separately.
 */
const dictionariesMap = new WeakMap<DictionaryResource[], Dictionaries>();

/** Returns a query that returns a Dictionaries object. */
export function useDictionaries() {
  const t = useLangFunc();
  const query = createQuery(System.dictionariesQueryOptions);
  const dictionaries = createMemo(() => {
    if (!query.isSuccess) {
      return undefined;
    }
    const resources = query.data;
    let dictionaries = dictionariesMap.get(resources);
    if (dictionaries) {
      return dictionaries;
    }
    // Make sure the translations are loaded. Here it is critical because the created Dictionary objects
    // are not reactive and will not update later.
    if (!translationsLoaded()) {
      return undefined;
    }
    dictionaries = Dictionaries.fromResources(t, resources);
    dictionariesMap.set(resources, dictionaries);
    return dictionaries;
  });
  return dictionaries;
}
