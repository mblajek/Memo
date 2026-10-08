import {createdId} from "../responses.ts";
import {type ClientsArtifact, clientsLayer} from "./clients.ts";
import {STAFF_ADMIN} from "./facility.ts";

/** A second facility, with no members, owning one dictionary — for the facility-scoping tests. */
const TECHNICALS_OTHER_FACILITY = {name: "Integration Test Technicals Facility", url: "int-test-tech"} as const;

/** Stored names. The "+" prefix marks a literal name; without it the name is a translation key. */
export const COLOUR_DICT_NAME = "+E2E Colours";
export const COLOUR_NAMES = ["+Red", "+Green", "+Blue"] as const;
export const EMPTY_DICT_NAME = "+E2E Empty";
export const OTHER_DICT_NAME = "+E2E Other Facility Dict";

export const COLOURS_ATTR = {name: "+E2E colours", apiName: "e2eColours"} as const;
export const NICKNAME_ATTR = {name: "+E2E nickname", apiName: "e2eNickname"} as const;
/** A client attribute with no values anywhere, so deletable. */
const UNUSED_ATTR = {name: "+E2E unused", apiName: "e2eUnused"} as const;

export const TAGGED_CLIENT_NICKNAME = "Ace";

export type TechnicalsArtifact = ClientsArtifact & {
  /** Facility dictionary with the positions `COLOUR_NAMES`, in that order. */
  readonly colourDictId: string;
  readonly colourIds: {readonly red: string; readonly green: string; readonly blue: string};
  /** Facility dictionary with no positions and no attribute using it. */
  readonly emptyDictId: string;
  /** Multi-value dict attribute of clients, over the colours dictionary. */
  readonly coloursAttrId: string;
  /** Single-value string attribute of clients. */
  readonly nicknameAttrId: string;
  readonly unusedAttrId: string;
  /** The client (Adam Kowalski) with colours = [red] and a nickname set. */
  readonly taggedClientId: string;
  readonly otherFacilityId: string;
  /** A dictionary of the other facility, with one position. */
  readonly otherDictId: string;
  readonly otherPositionId: string;
};

/**
 * Adds custom technicals on top of the clients: two facility dictionaries (one with positions),
 * three facility client attributes, one client with values of two of them, and a second facility
 * with a dictionary of its own.
 */
export const technicalsLayer = clientsLayer.createSubLayer<TechnicalsArtifact>(
  "Technicals",
  async ({api: globalAdminApi, parentArtifact}) => {
    const {facilityId, adultClientInfos} = parentArtifact;
    const otherFacilityId = await createdId(
      await globalAdminApi.createFacility({name: TECHNICALS_OTHER_FACILITY.name, url: TECHNICALS_OTHER_FACILITY.url}),
    );
    const otherDictId = await createdId(
      await globalAdminApi.post("admin/dictionary", {
        facilityId: otherFacilityId,
        name: OTHER_DICT_NAME,
        isExtendable: true,
      }),
    );
    const otherPositionId = await createdId(
      await globalAdminApi.post("admin/position", {
        facilityId: otherFacilityId,
        dictionaryId: otherDictId,
        name: "+Other option",
        isDisabled: false,
      }),
    );

    const api = await globalAdminApi.loggedInAs(STAFF_ADMIN);
    const adminPath = `facility/${facilityId}/admin`;
    const colourDictId = await createdId(await api.post(`${adminPath}/dictionary`, {name: COLOUR_DICT_NAME}));
    const colourPositionIds: string[] = [];
    for (const name of COLOUR_NAMES) {
      colourPositionIds.push(
        await createdId(await api.post(`${adminPath}/position`, {dictionaryId: colourDictId, name, isDisabled: false})),
      );
    }
    const [red, green, blue] = colourPositionIds as [string, string, string];
    const emptyDictId = await createdId(await api.post(`${adminPath}/dictionary`, {name: EMPTY_DICT_NAME}));

    async function createClientAttribute(args: {
      name: string;
      apiName: string;
      type: string;
      dictionaryId: string | null;
      isMultiValue: boolean;
    }) {
      return createdId(
        await api.post(`${adminPath}/attribute`, {
          model: "client",
          requirementLevel: "optional",
          description: null,
          ...args,
        }),
      );
    }
    const coloursAttrId = await createClientAttribute({
      ...COLOURS_ATTR,
      type: "dict",
      dictionaryId: colourDictId,
      isMultiValue: true,
    });
    const nicknameAttrId = await createClientAttribute({
      ...NICKNAME_ATTR,
      type: "string",
      dictionaryId: null,
      isMultiValue: false,
    });
    const unusedAttrId = await createClientAttribute({
      ...UNUSED_ATTR,
      type: "string",
      dictionaryId: null,
      isMultiValue: false,
    });

    const taggedClientId = adultClientInfos[0]!.id;
    await api.patch(`facility/${facilityId}/user/client/${taggedClientId}`, {
      client: {[COLOURS_ATTR.apiName]: [red], [NICKNAME_ATTR.apiName]: TAGGED_CLIENT_NICKNAME},
    });

    return {
      ...parentArtifact,
      colourDictId,
      colourIds: {red, green, blue},
      emptyDictId,
      coloursAttrId,
      nicknameAttrId,
      unusedAttrId,
      taggedClientId,
      otherFacilityId,
      otherDictId,
      otherPositionId,
    };
  },
);
