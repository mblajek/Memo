import {NameString} from "./name_string";

/**
 * An attribute name. In the translatable variant, the translation key
 * is the first present of:
 * - `attributes.attributes.${model}.$.name`
 * - `attributes.attributes.generic.$.name`
 * - `models.${model}.${apiName}`
 * - `models.generic.${apiName}`
 * - the dictionary name, if the attribute value is from a dictionary
 */
export type AttributeName = NameString;

/**
 * Either a string, which is a non-translatable description of the attribute, displayed directly in the UI,
 * or null for getting the description from `attributes.attributes.${model}.${name}.desc`
 * (or `attributes.attributes.generic.${name}.desc`).
 */
export type AttributeDescription = string | null;

/** A model name which is a value of an attribute. */
export type AttributeModel = string;

export type SimpleAttributeType = "string" | "text" | "int" | "bool" | "date" | "datetime";
export type DictAttributeType = "dict";
export type DataAttributeType = SimpleAttributeType | DictAttributeType | AttributeModel;
export type SeparatorAttributeType = "separator";
export type AttributeType = DataAttributeType | SeparatorAttributeType;

export const REQUIREMENT_LEVELS = ["empty", "optional", "recommended", "required"] as const;
export type RequirementLevel = (typeof REQUIREMENT_LEVELS)[number];

/**
 * The attribute resource.
 * @see `/help/tables/attributes.md`
 * @see `/app/Http/Resources/AttributeResource.php`
 */
export interface AttributeResource {
  readonly id: string;
  /** The facility that owns this attribute, or null for global attribute. */
  readonly facilityId: string | null;
  readonly model: string;
  readonly name: AttributeName;
  readonly description: AttributeDescription;
  /** The field name in API communication. */
  readonly apiName: string;
  readonly type: AttributeType;
  readonly metadata: AttributeMetadataResource | null;
  /** The type of the attribute, filled in only if it is a model value (not simple value or dict). */
  readonly typeModel: AttributeModel | null;
  /** The dictionary type. Only filled in if type is dict. */
  readonly dictionaryId: string | null;
  /**
   * Whether the attribute is unmodifiable even by the admin.
   * Fixed dictionaries can be referenced by name in the code.
   */
  readonly isFixed: boolean;
  readonly defaultOrder: number;
  readonly isMultiValue: boolean | null;
  readonly requirementLevel: RequirementLevel;
}

export interface AttributeMetadataResource {
  // For string and text:
  readonly isMultiLine?: boolean;
}
