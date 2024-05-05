const ATTRIBUTE_MODEL_SYMBOL = Symbol("ATTRIBUTE_MODEL");

/** A marker interface for types that are attributable, i.e. can have attributes. */
export interface Attributable {
  /** The apiName of the models that this object represents. */
  readonly [ATTRIBUTE_MODEL_SYMBOL]: readonly string[];
}

/** Returns a copy of the object which is also attributable as the specified model(s). */
export function makeAttributable<O extends object>(object: O, model: string | string[]): O & Attributable {
  const models = new Set<string>(isAttributable(object) ? getAttributeModel(object) : undefined);
  if (Array.isArray(model)) {
    for (const m of model) {
      models.add(m);
    }
  } else {
    models.add(model);
  }
  return {...object, [ATTRIBUTE_MODEL_SYMBOL]: [...models]};
}

export function isAttributable<O extends object>(object: O): object is O & Attributable {
  return Object.hasOwn(object, ATTRIBUTE_MODEL_SYMBOL);
}

/** Returns a list of apiName of models as which the specified object is attributable. */
export function getAttributeModel(object: Attributable) {
  return object[ATTRIBUTE_MODEL_SYMBOL];
}

/**
 * Reads the attribute value from the object.
 * The caller is responsible for specifying the correct type T.
 */
export function readAttribute<T>(object: Attributable, attributeApiName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (object as any)[attributeApiName] as T | undefined;
}

/** An attribute to extend, to mark that an object (e.g. from the API) is attributable as the specified model. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface AttributableMarker<Model extends string> {}
