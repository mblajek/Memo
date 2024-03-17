import {NameString} from "./name_string";

/** A dictionary name. In the translatable variant, the translation key is `dictionary.$._name`. */
export type DictionaryName = NameString;

/**
 * A dictionary position name. In the translatable variant, the translation key
 * is `dictionary.${dictionaryName}.$`.
 */
export type DictionaryPositionName = NameString;

/**
 * @see `/app/Http/Resources/DictionaryResource.php`
 */
export interface DictionaryResource {
  readonly id: string;
  /** The facility that owns this dictionary, or null for global dictionary. */
  readonly facilityId: string | null;
  readonly name: DictionaryName;
  /** The positions in the dictionary, sorted by their sort order. */
  readonly positions: readonly PositionResource[];
  /**
   * Whether the dictionary is unmodifiable even by the admin.
   * Fixed dictionaries can be referenced by name in the code.
   */
  readonly isFixed: boolean;
  /** Whether the admins can add positions to the dictionary. */
  readonly isExtendable: boolean;
  /** The ids of attributes that are applied to every position in the dictionary. This is an attribute. */
  readonly positionRequiredAttributeIds?: readonly string[];
}

/**
 * @see `/app/Http/Resources/PositionResource.php`
 */
export interface PositionResource {
  readonly id: string;
  readonly dictionaryId: string;
  /** The facility that owns this position, or null for global position. */
  readonly facilityId: string | null;
  readonly name: DictionaryPositionName;
  readonly isFixed: boolean;
  readonly defaultOrder: number;
  /** Whether this position is unavailable as a value for new fields. */
  readonly isDisabled: boolean;
}
