import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";

export function createAttributesProcessor(model: string) {
  const attributes = useAttributes();
  return {
    extract(formValues: Record<string, unknown>) {
      const result: Record<string, unknown> = {};
      for (const attribute of attributes()?.getForModel(model) || []) {
        if (Object.hasOwn(formValues, attribute.apiName)) {
          let value = formValues[attribute.apiName] ?? null;
          if (attribute.multiple && Array.isArray(value)) {
            // Remove the last value if it's empty.
            if (value.length && (value.at(-1) == undefined || value.at(-1) === "")) {
              value = value.slice(0, -1);
            }
          }
          result[attribute.apiName] = value;
        }
      }
      return result;
    },
  };
}
