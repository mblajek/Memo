import {createdId} from "../responses.ts";
import {type FacilityArtifact, STAFF_ADMIN, facilityLayer} from "./facility.ts";

/**
 * Clients are seeded with surnames so a downstream Client Groups layer can group them by family.
 * Each entry carries its first/last names plus optional extra fields the seed should populate so
 * we have variety in client_tquery / clients-table tests.
 */
interface ClientSeed {
  readonly firstName: string;
  readonly surname: string;
  readonly extra?: {
    readonly genderName?: "female" | "male" | "other" | "unknown";
    readonly birthDate?: string;
    readonly notes?: string;
    readonly contactEmail?: string;
    readonly contactPhone?: string;
    readonly addressCity?: string;
  };
}

/**
 * Adult seed: 5 adults across 3 surnames (Kowalski, Nowak, Wisniewski). Adam, Bea, and Eve are
 * in the Kowalski family for the family-group test; Carl is in Nowak (1+1 test); Diana is
 * Wisniewski (single-surname adult).
 */
const ADULT_SEEDS: readonly ClientSeed[] = [
  {
    firstName: "Adam",
    surname: "Kowalski",
    extra: {genderName: "male", birthDate: "1985-04-12", contactPhone: "+48 600 100 001"},
  },
  {
    firstName: "Bea",
    surname: "Kowalski",
    extra: {genderName: "female", birthDate: "1987-09-30", contactEmail: "bea@example.test"},
  },
  {firstName: "Carl", surname: "Nowak", extra: {genderName: "male", addressCity: "Warszawa"}},
  {firstName: "Diana", surname: "Wisniewski", extra: {genderName: "female", notes: "VIP client"}},
  {firstName: "Eve", surname: "Kowalski"},
];

/**
 * Child seed: 5 children across the same 3 surnames. Zoe & Will are Kowalski (family group);
 * Yara is Nowak (1+1 group); Xander & Violet are Wisniewski (mixed-surname group used in the
 * "same adult, different children" scenario).
 */
const CHILD_SEEDS: readonly ClientSeed[] = [
  {firstName: "Zoe", surname: "Kowalski", extra: {genderName: "female", birthDate: "2015-06-22"}},
  {firstName: "Will", surname: "Kowalski", extra: {genderName: "male", birthDate: "2017-12-03"}},
  {firstName: "Yara", surname: "Nowak", extra: {genderName: "female"}},
  {firstName: "Xander", surname: "Wisniewski"},
  {firstName: "Violet", surname: "Wisniewski", extra: {genderName: "female", notes: "Allergy: peanuts"}},
];

export const CLIENTS_ADULTS = ADULT_SEEDS.map(fullName) as readonly string[];
export const CLIENTS_CHILDREN = CHILD_SEEDS.map(fullName) as readonly string[];

function fullName(s: ClientSeed): string {
  return `${s.firstName} ${s.surname}`;
}

export type ClientInfo = {
  readonly id: string;
  readonly typeDictId: string;
  readonly name: string;
  readonly firstName: string;
  readonly surname: string;
};

export type ClientsArtifact = FacilityArtifact & {
  readonly adultClientInfos: readonly ClientInfo[];
  readonly childClientInfos: readonly ClientInfo[];
};

export const clientsLayer = facilityLayer.createSubLayer<ClientsArtifact>("Clients", async ({api, parentArtifact}) => {
  await api.login(STAFF_ADMIN);
  const dicts = await api.dictionaries();
  const clientType = dicts.clientType!;
  const gender = dicts.gender!;

  const adultClientInfos: ClientInfo[] = [];
  const childClientInfos: ClientInfo[] = [];

  for (const [seeds, typeDictId, infos] of [
    [ADULT_SEEDS, clientType.adult!, adultClientInfos],
    [CHILD_SEEDS, clientType.child!, childClientInfos],
  ] as const) {
    for (const seed of seeds) {
      const name = fullName(seed);
      const clientFields: {typeDictId: string; [k: string]: unknown} = {typeDictId};
      const {genderName, ...extra} = seed.extra ?? {};
      if (genderName) {
        clientFields.genderDictId = gender[genderName]!;
      }
      for (const [field, value] of Object.entries(extra)) {
        if (value) {
          clientFields[field] = value;
        }
      }

      const res = await api.createFacilityClient(parentArtifact.facilityId, {name, client: clientFields});
      const id = await createdId(res);
      infos.push({id, typeDictId, name, firstName: seed.firstName, surname: seed.surname});
    }
  }
  return {...parentArtifact, adultClientInfos, childClientInfos};
});
