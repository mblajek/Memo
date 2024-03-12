import {useAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";

export function createAttributesProcessor(model: string) {
  const attributes = useAttributes();
  return {
    extract(formValues: Record<string, unknown>) {
      const result: Record<string, unknown> = {};
      for (const attribute of attributes()?.getForModel(model) || []) {
        if (Object.hasOwn(formValues, attribute.apiName)) {
          result[attribute.apiName] = formValues[attribute.apiName] ?? null;
        }
      }
      return result;
    },
  };
}
