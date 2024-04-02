import {LangFunc, NON_NULLABLE} from "components/utils";
import {FacilityIdOrGlobal} from "state/activeFacilityId.state";
import {makeAttributable} from "./attributable";
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
    /** A map of all the positions from all the dictionaries, by id. */
    readonly positionsById: ReadonlyMap<string, Position>,
  ) {}

  static readonly EMPTY = new Dictionaries(new Map(), new Map(), new Map());

  static fromResources(t: LangFunc, resources: DictionaryResource[]) {
    return Dictionaries.fromDictionaries(resources.map((resource) => Dictionary.fromResource(t, resource)));
  }

  private static fromDictionaries(dictinoaries: Dictionary[]) {
    const byId = new Map<string, Dictionary>();
    const byName = new Map<string, Dictionary>();
    const positionsById = new Map<string, Position>();
    for (const dictionary of dictinoaries) {
      byId.set(dictionary.id, dictionary);
      if (dictionary.resource.isFixed && dictionary.isTranslatable) {
        byName.set(dictionary.name, dictionary);
      }
      for (const position of dictionary.allPositions) {
        positionsById.set(position.id, position);
      }
    }
    return new Dictionaries(byId, byName, positionsById);
  }

  [Symbol.iterator]() {
    return this.byId.values();
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
      Array.from(this, (dictionary) => dictionary.subsetFor(facilityIdOrGlobal)).filter(NON_NULLABLE),
    );
  }

  getPositionById(positionId: string) {
    const position = this.positionsById.get(positionId);
    if (!position) {
      throw new Error(`Position ${positionId} not found.`);
    }
    return position;
  }
}

export class Dictionary {
  readonly resource;
  /** A list of non-disabled positions in the dictionary. */
  readonly activePositions;

  private readonly byIdOrName = new Map<string, Position>();

  private constructor(
    resource: DictionaryResource,
    readonly id: string,
    readonly name: string,
    readonly isTranslatable: boolean,
    /** The translated name of the dictionary. */
    readonly label: string,
    /** The list of all positions of the dictionary, including the disabled ones. */
    readonly allPositions: Position[],
  ) {
    this.resource = makeAttributable(resource, "dictionary");
    this.activePositions = this.allPositions.filter((position) => !position.resource.isDisabled);
    for (const position of allPositions) {
      if (position.resource.isFixed && position.isTranslatable) {
        this.byIdOrName.set(position.resource.name, position);
      }
    }
    for (const position of allPositions) {
      this.byIdOrName.set(position.id, position);
    }
  }

  get(positionIdOrName: string) {
    const position = this.byIdOrName.get(positionIdOrName);
    if (!position) {
      throw new Error(`Position ${positionIdOrName} not found in dictionary ${this.name}.`);
    }
    return position;
  }

  static fromResource(t: LangFunc, resource: DictionaryResource) {
    const isTranslatable = isNameTranslatable(resource.name);
    return new Dictionary(
      resource,
      resource.id,
      resource.name,
      isTranslatable,
      getNameTranslation(t, resource.name, (n) => dictionaryNameTranslationKey(n)),
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
      return new Dictionary(this.resource, this.id, this.name, this.isTranslatable, this.label, positionsSubset);
    }
    return undefined;
  }
}

export type TypedDictionary<P extends string> = {
  getDictionary(): Dictionary;
  getPosition(positionIdOrName: string): Position;
} & {
  readonly [positionName in P]: Position;
};

export function typedDictionary<P extends string>(dict: Dictionary, positionNames: P[]) {
  const positions: Partial<Record<P, Position>> = {};
  for (const name of positionNames) {
    positions[name] = dict.get(name);
  }
  return {
    getDictionary: () => dict,
    getPosition: (positionIdOrName: string) => dict.get(positionIdOrName),
    ...positions,
  } as TypedDictionary<P>;
}

/**
 * A dictionary position.
 *
 * The name property is not surfaced in the Position because it is not recommended to compare a position's name
 * to a string literal, as this is prone to typos. Compare instead like this:
 *
 *     position.id === dictionaries().get("dictName").get("positionName").id
 *
 * or:
 *
 *     position.id === typedDict.positionName.id
 */
export class Position {
  readonly resource;
  readonly id;
  readonly isTranslatable;
  readonly label;
  readonly disabled;

  constructor(
    t: LangFunc,
    resource: PositionResource,
    /** The name of the dictionary, if it's a translatable name. */
    readonly dictionaryTranslatableName: string | undefined,
  ) {
    this.resource = makeAttributable(resource, "position");
    this.id = resource.id;
    this.isTranslatable = isNameTranslatable(resource.name);
    this.label = getNameTranslation(t, resource.name, (n) => {
      if (!resource.isFixed) {
        console.error(`Translatable non-fixed position (${resource.id}: ${n})`);
        return `???.${n}`;
      }
      if (!dictionaryTranslatableName) {
        console.error(`Translatable position (${resource.id}: ${n}) inside a dictionary with an untranslatable name.`);
        return `dictionary.?.${n}`;
      }
      return `dictionary.${dictionaryTranslatableName}.${n}`;
    });
    this.disabled = resource.isDisabled;
  }
}

export function dictionaryNameTranslationKey(dictionaryName: string) {
  return `dictionary.${dictionaryName}._name`;
}
