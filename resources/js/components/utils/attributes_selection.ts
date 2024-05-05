import {Attribute} from "data-access/memo-api/attributes";

export interface PartialAttributesSelection<D = never> {
  /** Whether to include the non-fixed attributes. Default: true. */
  readonly includeNonFixed?: boolean;
  /** Whether to include the fixed attributes. Default: false. */
  readonly includeFixed?: boolean;
  /**
   * Map from fixed attribute apiName to the override value. Values meaning:
   * - false: disables this fixed attribute, even if includeFixed is true.
   * - true or other non-null: enables this fixed attribute, even if includeFixed is false.
   *   The value can also provide an override value for the attribute. The meaning of this value
   *   depends on the context where the selection is used.
   *
   * TODO: Ensure somehow no typos in keys.
   */
  readonly fixedOverrides?: Partial<Record<string, boolean | D>>;
}

export interface AttributesSelection<D = true> extends Required<PartialAttributesSelection<D>> {}

export function attributesSelectionFromPartial<D>({
  includeNonFixed = true,
  includeFixed = false,
  fixedOverrides = {},
}: PartialAttributesSelection<D> = {}): AttributesSelection<D> {
  return {includeNonFixed, includeFixed, fixedOverrides};
}

export function getUnknownFixedAttributes<D>(
  selection: AttributesSelection<D>,
  attributes: Attribute[],
): string[] | undefined {
  const unknownFixedAttributes = new Set(Object.keys(selection.fixedOverrides));
  for (const attribute of attributes) {
    if (attribute.isFixed) {
      unknownFixedAttributes.delete(attribute.apiName);
    }
  }
  return unknownFixedAttributes.size ? [...unknownFixedAttributes] : undefined;
}

export function isAttributeSelected<D>(
  selection: AttributesSelection<D>,
  {isFixed, apiName}: Pick<Attribute, "isFixed" | "apiName">,
): {selected: true; explicit: boolean; override?: D} | undefined {
  if (isFixed) {
    const override = selection.fixedOverrides[apiName];
    return override === undefined
      ? selection.includeFixed
        ? {selected: true, explicit: false}
        : undefined
      : override === true
        ? {selected: true, explicit: true}
        : override === false
          ? undefined
          : {selected: true, explicit: true, override};
  } else {
    return selection.includeNonFixed ? {selected: true, explicit: false} : undefined;
  }
}
