import {Attribute} from "data-access/memo-api/attributes";

export interface PartialAttributesSelection<D = never> {
  readonly model: string;
  /** Whether to include the non-fixed attributes. Default: true. */
  readonly includeNonFixed?: boolean;
  /** Whether to include the fixed attributes. Default: false. */
  readonly includeFixed?: boolean;
  /**
   * Map from fixed attribute apiName, potentially with a suffix appended after a dot,
   * to the override value. Values meaning:
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
  model,
  includeNonFixed = true,
  includeFixed = false,
  fixedOverrides = {},
}: PartialAttributesSelection<D>): AttributesSelection<D> {
  return {model, includeNonFixed, includeFixed, fixedOverrides};
}

/** Returns the list of fixed attributes specified in the selection that do not exist. */
export function getUnknownFixedAttributes<D>(
  selection: AttributesSelection<D>,
  attributes: Attribute[],
): string[] | undefined {
  const unknownFixedAttributes = new Set(Object.keys(selection.fixedOverrides).map((key) => key.split(".")[0]!));
  for (const attribute of attributes)
    if (attribute.model === selection.model)
      if (attribute.isFixed) {
        unknownFixedAttributes.delete(attribute.apiName);
      }
  return unknownFixedAttributes.size ? [...unknownFixedAttributes] : undefined;
}

export function isAttributeSelected<D>(
  selection: AttributesSelection<D>,
  {model, isFixed, apiName}: Pick<Attribute, "model" | "isFixed" | "apiName">,
  suffix?: string,
): {selected: true; explicit: boolean; override?: D} | undefined {
  if (model !== selection.model) {
    return undefined;
  }
  if (isFixed) {
    const override = selection.fixedOverrides[suffix ? `${apiName}.${suffix}` : apiName];
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
