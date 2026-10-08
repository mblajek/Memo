import {createdId} from "../responses.ts";
import {type ClientInfo, type ClientsArtifact, clientsLayer} from "./clients.ts";
import {STAFF_ADMIN} from "./facility.ts";

export type GroupInfo = {
  readonly id: string;
  readonly notes: string;
  readonly memberUserIds: readonly string[];
};

export type ClientGroupsArtifact = ClientsArtifact & {
  /** Kowalski family — 2 adults (Adam, Bea) + 2 children (Zoe, Will). */
  readonly familyGroup: GroupInfo;
  /** Nowak pair — 1 adult (Carl) + 1 child (Yara). */
  readonly pairGroup: GroupInfo;
  /** "Adam's mixed" — adult Adam (also in familyGroup) + 2 Wisniewski children. */
  readonly mixedGroup: GroupInfo;
};

function findBySurname(infos: readonly ClientInfo[], surname: string): readonly ClientInfo[] {
  return infos.filter((i) => i.surname === surname);
}

function findByFirstName(infos: readonly ClientInfo[], firstName: string): ClientInfo {
  const m = infos.find((i) => i.firstName === firstName);
  if (!m) {
    throw new Error(`Seed mismatch: no client named "${firstName}"`);
  }
  return m;
}

export const clientGroupsLayer = clientsLayer.createSubLayer<ClientGroupsArtifact>(
  "Client Groups",
  async ({api, parentArtifact}) => {
    await api.login(STAFF_ADMIN);
    const {facilityId, adultClientInfos, childClientInfos} = parentArtifact;

    let lastCreatedAt = 0;
    async function createGroup(notes: string, members: readonly ClientInfo[]): Promise<GroupInfo> {
      // The groups of a client are ordered by the time the client joined them, kept to the second:
      // groups made within one second would come in no particular order.
      await new Promise((resolve) => setTimeout(resolve, Math.max(0, lastCreatedAt + 1100 - Date.now())));
      lastCreatedAt = Date.now();
      const memberUserIds = members.map((m) => m.id);
      const res = await api.createClientGroup(facilityId, {
        notes,
        clients: memberUserIds.map((userId) => ({userId, role: null})),
      });
      const id = await createdId(res);
      return {id, notes, memberUserIds};
    }

    const kowalskiAdults = findBySurname(adultClientInfos, "Kowalski").slice(0, 2); // Adam, Bea
    const kowalskiChildren = findBySurname(childClientInfos, "Kowalski"); // Zoe, Will
    const familyGroup = await createGroup("Kowalski family", [...kowalskiAdults, ...kowalskiChildren]);

    const nowakAdults = findBySurname(adultClientInfos, "Nowak"); // Carl
    const nowakChildren = findBySurname(childClientInfos, "Nowak"); // Yara
    const pairGroup = await createGroup("Nowak pair", [...nowakAdults, ...nowakChildren]);

    const adam = findByFirstName(adultClientInfos, "Adam");
    const wisniewskiChildren = findBySurname(childClientInfos, "Wisniewski"); // Xander, Violet
    const mixedGroup = await createGroup("Adam's mixed group", [adam, ...wisniewskiChildren]);

    return {...parentArtifact, familyGroup, pairGroup, mixedGroup};
  },
);
