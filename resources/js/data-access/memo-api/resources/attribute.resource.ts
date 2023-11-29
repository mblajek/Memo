import {NameString} from "./name_string";

/**
 * An attribute name. In the translatable variant, the translation key
 * is `models.${model}.$`.
 */
export type AttributeName = NameString;

/** A model name which is a value of an attribute. */
export type AttributeModel = string;

type SimpleAttributeType = "string" | "int" | "bool" | "date" | "datetime";
type DictAttributeType = "dict";
export type AttributeType = SimpleAttributeType | DictAttributeType | AttributeModel;

export type RequirementLevel = "required" | "recommended" | "optional" | "empty";

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
  /** The field name in API communication. */
  readonly apiName: string;
  readonly type: AttributeType;
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
