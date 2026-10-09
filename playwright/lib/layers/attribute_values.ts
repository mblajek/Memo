import {createdId} from "../responses.ts";
import {type ClientsArtifact, clientsLayer} from "./clients.ts";
import {STAFF_ADMIN} from "./facility.ts";

/** Stored names. The "+" prefix marks a literal name; without it the name is a translation key. */
export const SIZE_DICT_NAME = "+E2E Sizes";
export const SIZE_NAMES = ["+Small", "+Medium", "+Large"] as const;

interface AttrDef {
  readonly name: string;
  readonly apiName: string;
  readonly type: "separator" | "bool" | "date" | "datetime" | "int" | "string" | "text" | "dict";
  readonly isMultiValue: boolean;
  readonly requirementLevel: "required" | "recommended" | "optional" | "empty";
}

function attr(
  label: string,
  apiName: string,
  type: AttrDef["type"],
  requirementLevel: AttrDef["requirementLevel"],
  {multi = false} = {},
): AttrDef {
  return {name: `+${label}`, apiName, type, isMultiValue: multi, requirementLevel};
}

/**
 * The client attributes of the layer, in their order: every type the attributes page offers, every
 * requirement level, and the multi-value variants the client form has a control for.
 */
export const VALUE_ATTRS = {
  basics: attr("E2E basics", "e2eBasics", "separator", "empty"),
  flag: attr("E2E flag", "e2eFlag", "bool", "optional"),
  day: attr("E2E day", "e2eDay", "date", "recommended"),
  moment: attr("E2E moment", "e2eMoment", "datetime", "optional"),
  count: attr("E2E count", "e2eCount", "int", "optional"),
  label: attr("E2E label", "e2eLabel", "string", "required"),
  story: attr("E2E story", "e2eStory", "text", "optional"),
  size: attr("E2E size", "e2eSize", "dict", "required"),
  lists: attr("E2E lists", "e2eLists", "separator", "empty"),
  tags: attr("E2E tags", "e2eTags", "string", "optional", {multi: true}),
  numbers: attr("E2E numbers", "e2eNumbers", "int", "optional", {multi: true}),
  days: attr("E2E days", "e2eDays", "date", "optional", {multi: true}),
  sizes: attr("E2E sizes", "e2eSizes", "dict", "required", {multi: true}),
  legacy: attr("E2E legacy", "e2eLegacy", "string", "empty"),
} as const satisfies Record<string, AttrDef>;

export type ValueAttrKey = keyof typeof VALUE_ATTRS;

/** The api names of the attributes that hold a value, in their order. */
export const VALUE_API_NAMES: readonly string[] = Object.values(VALUE_ATTRS)
  .filter(({type}) => type !== "separator")
  .map(({apiName}) => apiName);

/**
 * The values of the filled client, apart from the dictionary ones (`size`: medium; `sizes`: large,
 * small).
 */
export const FILLED_VALUES = {
  e2eFlag: true,
  e2eDay: "2024-02-29",
  e2eMoment: "2024-03-04T10:30:00Z",
  e2eCount: 42,
  e2eLabel: "Alpha",
  e2eStory: "Line one\nLine two",
  e2eTags: ["red tape", "blue"],
  e2eNumbers: [3, 1, 2],
  e2eDays: ["2024-01-05", "2023-12-24"],
  e2eLegacy: "Old value",
} as const;

/** The value of the required string attribute of the client with the required values only. */
export const REQUIRED_ONLY_LABEL = "Beta";

export type AttributeValuesArtifact = ClientsArtifact & {
  /** Facility dictionary with the positions `SIZE_NAMES`, in that order. */
  readonly sizeDictId: string;
  readonly sizeIds: {readonly small: string; readonly medium: string; readonly large: string};
  /** The ids of the attributes `VALUE_ATTRS`. */
  readonly attrIds: Readonly<Record<ValueAttrKey, string>>;
  /** The client (Adam Kowalski) with a value of every attribute. */
  readonly filledClientId: string;
  /** The client (Bea Kowalski) with the values of the required attributes only. */
  readonly requiredOnlyClientId: string;
};

/**
 * Adds, on top of the clients, a facility dictionary and a client attribute of each type and of
 * each requirement level, with a client that has every value and one that has the required ones.
 * The other clients have none, as clients made before the attributes were.
 */
export const attributeValuesLayer = clientsLayer.createSubLayer<AttributeValuesArtifact>(
  "Attribute Values",
  async ({api: globalAdminApi, parentArtifact}) => {
    const {facilityId, adultClientInfos} = parentArtifact;
    const api = await globalAdminApi.loggedInAs(STAFF_ADMIN);
    const adminPath = `facility/${facilityId}/admin`;
    const sizeDictId = await createdId(await api.post(`${adminPath}/dictionary`, {name: SIZE_DICT_NAME}));
    const sizePositionIds: string[] = [];
    for (const name of SIZE_NAMES) {
      sizePositionIds.push(
        await createdId(await api.post(`${adminPath}/position`, {dictionaryId: sizeDictId, name, isDisabled: false})),
      );
    }
    const [small, medium, large] = sizePositionIds as [string, string, string];

    const attrIds: Partial<Record<ValueAttrKey, string>> = {};
    for (const [key, def] of Object.entries(VALUE_ATTRS) as [ValueAttrKey, AttrDef][]) {
      attrIds[key] = await createdId(
        await api.post(`${adminPath}/attribute`, {
          model: "client",
          description: null,
          dictionaryId: def.type === "dict" ? sizeDictId : null,
          ...def,
        }),
      );
    }

    const filledClientId = adultClientInfos[0]!.id;
    await api.patch(`facility/${facilityId}/user/client/${filledClientId}`, {
      client: {...FILLED_VALUES, e2eSize: medium, e2eSizes: [large, small]},
    });
    const requiredOnlyClientId = adultClientInfos[1]!.id;
    await api.patch(`facility/${facilityId}/user/client/${requiredOnlyClientId}`, {
      client: {e2eLabel: REQUIRED_ONLY_LABEL, e2eSize: small, e2eSizes: [medium]},
    });

    return {
      ...parentArtifact,
      sizeDictId,
      sizeIds: {small, medium, large},
      attrIds: attrIds as Record<ValueAttrKey, string>,
      filledClientId,
      requiredOnlyClientId,
    };
  },
);
