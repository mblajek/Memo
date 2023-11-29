import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {Attribute, useAllAttributes} from "data-access/memo-api/attributes";
import {useAllDictionaries} from "data-access/memo-api/dictionaries";

export function useAttrValueFormatter() {
  const attributes = useAllAttributes();
  const dictionaries = useAllDictionaries();
  return (attr: Attribute, val: unknown) => {
    function formatV(v: unknown) {
      if (attr.type === "dict" && typeof v === "string") {
        return dictionaries()?.get(attr.dictionaryId!)?.get(v).resource.name;
      } else if (attr.type === "attribute" && typeof v === "string") {
        return `@${attributes()?.get(v).resource.name}`;
      } else {
        return JSON.stringify(v);
      }
    }
    if (val === undefined) {
      return EMPTY_VALUE_SYMBOL;
    } else if (attr.multiple && Array.isArray(val)) {
      return val.map(formatV).join(", ");
    } else {
      return formatV(val);
    }
  };
}
