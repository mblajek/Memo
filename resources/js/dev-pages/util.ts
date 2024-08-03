import {EMPTY_VALUE_SYMBOL_STRING} from "components/ui/symbols";
import {Attribute} from "data-access/memo-api/attributes";
import {useAllAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";

export function useAttrValueFormatter() {
  const attributes = useAllAttributes();
  return (attr: Attribute, val: unknown) => {
    function formatV(v: unknown) {
      if (attr.type === "dict" && typeof v === "string") {
        return attr.dictionary!.get(v).resource.name;
      } else if (attr.type === "attribute" && typeof v === "string") {
        return `@${attributes()?.getById(v).apiName}`;
      } else {
        return JSON.stringify(v);
      }
    }
    if (val === undefined) {
      return EMPTY_VALUE_SYMBOL_STRING;
    } else if (attr.multiple && Array.isArray(val)) {
      return val.map(formatV).join(", ");
    } else {
      return formatV(val);
    }
  };
}
