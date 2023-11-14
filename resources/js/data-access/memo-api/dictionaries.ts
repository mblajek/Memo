import {createQuery} from "@tanstack/solid-query";
import {LangFunc, NON_NULLABLE, useLangFunc} from "components/utils";
import {translationsLoaded} from "i18n_loader";
import {createMemo} from "solid-js";
import {FacilityIdOrGlobal, activeFacilityId} from "state/activeFacilityId.state";
import {System} from "./groups";
import {DictionaryResource, PositionResource} from "./resources/dictionary.resource";
import {getNameTranslation, isNameTranslatable} from "./resources/name_string";
import {facilityIdMatches} from "./utils";

export class Dictionaries {
  private constructor(
    /** A map of all the dictionaries by id. */
    readonly byId: ReadonlyMap<string, Dictionary>,
    /**
     * A map of the fixed dictionaries by name.
     * Contains only the dictionaries with a translatable name (not starting with `+`).
     */
    readonly byName: ReadonlyMap<string, Dictionary>,
  ) {}

  static fromResources(t: LangFunc, resources: DictionaryResource[]) {
    return Dictionaries.fromDictionaries(resources.map((resource) => Dictionary.fromResource(t, resource)));
  }

  private static fromDictionaries(dictinoaries: Dictionary[]) {
    const byId = new Map<string, Dictionary>();
    const byName = new Map<string, Dictionary>();
    for (const dictionary of dictinoaries) {
      byId.set(dictionary.id, dictionary);
      if (dictionary.resource.isFixed && dictionary.isTranslatable) {
        byName.set(dictionary.resource.name, dictionary);
      }
    }
    return new Dictionaries(byId, byName);
  }

  /** Returns a dictionary by id, or a fixed dictionary by name. Throws an error if not found. */
  get(idOrName: string) {
    const dictionary = this.byId.get(idOrName) || this.byName.get(idOrName);
    if (!dictionary) {
      throw new Error(`Dictionary ${idOrName} not found.`);
    }
    return dictionary;
  }

  /**
   * Returns a subset of the dictionaries (and positions) accessible for the specified facility,
   * or for the global scope.
   */
  subsetFor(facilityIdOrGlobal: FacilityIdOrGlobal) {
    return Dictionaries.fromDictionaries(
      Array.from(this.byId.values(), (dictionary) => dictionary.subsetFor(facilityIdOrGlobal)).filter(NON_NULLABLE),
    );
  }
}

export class Dictionary {
  /** A list of non-disabled positions in the dictionary. */
  readonly activePositions;

  private constructor(
    readonly resource: DictionaryResource,
    readonly id: string,
    readonly isTranslatable: boolean,
    /** The translated name of the dictionary. */
    readonly label: string,
    /** The list of all positions of the dictionary, including the disabled ones. */
    readonly allPositions: Position[],
  ) {
    this.activePositions = this.allPositions.filter((position) => !position.resource.isDisabled);
  }

  static fromResource(t: LangFunc, resource: DictionaryResource) {
    const isTranslatable = isNameTranslatable(resource.name);
    return new Dictionary(
      resource,
      resource.id,
      isTranslatable,
      getNameTranslation(resource.name, (n) => t(`dictionary.${n}._name`)),
      resource.positions.map((position) => new Position(t, position, isTranslatable ? resource.name : undefined)),
    );
  }

  /**
   * Returns a dictionary with a subset of positions accessible for the specified facility,
   * or for the global scope. If the whole dictionary is not accessible, returns undefined.
   */
  subsetFor(facilityIdOrGlobal: FacilityIdOrGlobal) {
    if (facilityIdMatches(this.resource.facilityId, facilityIdOrGlobal)) {
      const positionsSubset = this.allPositions.filter((position) =>
        facilityIdMatches(position.resource.facilityId, facilityIdOrGlobal),
      );
      if (positionsSubset.length === this.allPositions.length) {
        return this;
      }
      return new Dictionary(this.resource, this.id, this.isTranslatable, this.label, positionsSubset);
    }
    return undefined;
  }
}

export class Position {
  readonly id;
  readonly label;
  readonly disabled;

  constructor(
    t: LangFunc,
    readonly resource: PositionResource,
    /** The name of the dictionary, if it's a translatable name. */
    readonly dictionaryTranslatableName: string | undefined,
  ) {
    this.id = resource.id;
    this.label = getNameTranslation(resource.name, (n) => {
      if (!dictionaryTranslatableName)
        throw new Error(
          `Translatable position (${resource.id}: ${n}) inside a dictionary with an untranslatable name.`,
        );
      return t(`dictionary.${dictionaryTranslatableName}.${n}`);
    });
    this.disabled = resource.isDisabled;
  }
}

/**
 * A cache of the Dictionaries objects created from the backend's response. It is here to prevent
 * creating the Dictionaries object separately for every subscriber of the query.
 *
 * A simple createMemo approach will not work because a file-level memo is not allowed, and a
 * memo in useDictionaries will run its code for each subscriber separately.
 */
const dictionariesMap = new WeakMap<DictionaryResource[], Dictionaries>();

/** Returns a Dictionaries object containing all the dictionaries in the system. */
export function useAllDictionaries() {
  const t = useLangFunc();
  const query = createQuery(System.dictionariesQueryOptions);
  const allDictionaries = createMemo(() => {
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
  return allDictionaries;
}

/**
 * Returns a Dictionaries object with the dictionaries available in the current facility, or global
 * if there is no current facility.
 */
export function useDictionaries() {
  const allDictionaries = useAllDictionaries();
  const dictionaries = createMemo(() => allDictionaries()?.subsetFor(activeFacilityId()));
  return dictionaries;
}
