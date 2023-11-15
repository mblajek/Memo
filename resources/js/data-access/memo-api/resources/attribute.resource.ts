import {NameString} from "./name_string";

/**
 * An attribute name. In the translatable variant, the translation key
 * is `models.${model}.$`.
 */
export type AttributeName = NameString;

type SimpleAttributeType = "string" | "int" | "bool" | "date" | "datetime";
type TableAttributeType = "user";
type DictAttributeType = "dict";
export type AttributeType = SimpleAttributeType | TableAttributeType | DictAttributeType;

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
  readonly table: string;
  readonly model: string;
  readonly name: AttributeName;
  /** The field name in API communication. */
  readonly apiName: string;
  readonly type: AttributeType;
  /** The dictionary type. Only filled in if type is dict. */
  readonly dictionaryId: string | null;
  readonly defaultOrder: number;
  readonly isMultiValue: boolean | null;
  readonly requirementLevel: RequirementLevel;
}
