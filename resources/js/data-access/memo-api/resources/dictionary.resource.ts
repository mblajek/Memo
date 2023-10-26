/**
 * A string representing some name. There are two variants:
 * - If the string starts with `+`, then it is not translatable and should be displayed as is.
 * - Otherwise, it is a translatable string and should be translated before displaying.
 */
type DictionaryString = string;

/** A dictionary name. If not starting with `+`, the translation key is `dictionary.${dictionaryName}._name`. */
export type DictionaryName = DictionaryString;

/**
 * A dictionary position name. If not starting with `+`, the translation key is
 * `dictionary.${dictionaryName}.${positionName}`.
 */
export type DictionaryPositionName = DictionaryString;

export interface DictionaryResource {
  readonly id: string;
  /** The facility that owns this dictionary, or null for global dictionary. */
  readonly facilityId: string | null;
  readonly name: DictionaryName;
  /** The positions in the dictionary, sorted by their sort order. */
  readonly positions: PositionResource[];
  /**
   * Whether the dictionary is unmodifiable even by the admin.
   * Fixed dictionaries can be referenced by name in the code.
   */
  readonly isFixed: boolean;
  /** Whether the admins can add positions to the dictionary. */
  readonly isExtendable: boolean;
}

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
