import {IdentifiedColumnDef} from "@tanstack/table-core";
import {EMPTY_VALUE_SYMBOL_STRING} from "components/ui/symbols";
import {Attribute} from "data-access/memo-api/attributes";
import {useAllAttributes} from "data-access/memo-api/dictionaries_and_attributes_context";
import {activeFacilityId} from "state/activeFacilityId.state";

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

export function filterByFacility<T extends {resource: {facilityId: string | null}}>(
  collection: Iterable<T> | undefined,
  onlyActiveFacility: boolean,
): T[] {
  if (!collection) {
    return [];
  }
  return onlyActiveFacility
    ? [...collection].filter((f) => !f.resource.facilityId || f.resource.facilityId === activeFacilityId())
    : [...collection];
}

export function textSort<T>() {
  return {
    sortingFn: (a, b, colId) =>
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      ((a.getValue(colId) as string | undefined) || "").localeCompare(b.getValue(colId) || ""),
  } satisfies Partial<IdentifiedColumnDef<T>>;
}
