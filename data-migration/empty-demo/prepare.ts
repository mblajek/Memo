/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import {
  Client,
  ClientGroup,
  FacilityContents,
  facilityContentStats,
  FacilityStaff,
  Meeting,
} from "../facility_contents_type.ts";
import luxon from "../luxon.ts";
import {dictionariesAndAttributes} from "./dicts_and_attribs.ts";

const {DateTime} = luxon;
type DateTime = luxon.DateTime;

const OUT_PATH = "prepared-empty-demo.json";

const facilityStaff: FacilityStaff[] = [
  {
    nn: "mina.m@example.com",
    name: "Wilhelmina Murray",
    email: "mina.m@example.com",
    password: null,
    passwordExpireAt: null,
    deactivatedAt: null,
    isStaff: true,
    isAdmin: false,
  },
  {
    nn: "abrahamvh@example.com",
    name: "Abraham Van Helsing",
    email: "abrahamvh@example.com",
    password: null,
    passwordExpireAt: null,
    deactivatedAt: null,
    isStaff: true,
    isAdmin: true,
  },
  {
    nn: "dr.john.seward@example.com",
    name: "John Seward",
    email: "dr.john.seward@example.com",
    password: null,
    passwordExpireAt: null,
    deactivatedAt: null,
    isStaff: true,
    isAdmin: true,
  },
  {
    nn: "godalming@example.com",
    name: "Artur Holmwood",
    email: "godalming@example.com",
    password: null,
    passwordExpireAt: null,
    deactivatedAt: null,
    isStaff: true,
    isAdmin: false,
  },
];

const clients: Client[] = [
  {
    nn: "lucy",
    name: "Lucy Westenra",
    client: {
      typeDictId: {kind: "dict", dictName: "clientType", positionName: "adult"},
      genderDictId: {kind: "dict", dictName: "gender", positionName: "female"},
      birthDate: {kind: "const", value: "1874-05-03"},
      wiekWMomencieZgloszeniaU$: {kind: "const", value: 19},
      contactEmail: {kind: "const", value: "lucy.w@example.com"},
      addressCity: {kind: "const", value: "Londyn"},
      contactStartAt: {kind: "const", value: "1893-09-10"},
      contactEndAt: {kind: "const", value: "1893-09-28"},
      powodZgloszeniaU$: [
        {kind: "nn", nn: "powód zgłoszenia:przemoc fizyczna"},
        {kind: "nn", nn: "powód zgłoszenia:świadek przestępstwa"},
      ],
      documentsLinks: {kind: "const", value: ["opis (ang.): https://en.wikipedia.org/wiki/Lucy_Westenra"]},
      notes: {kind: "const", value: "Klientka wymaga terapii.\n#wampir"},
      anyFieldsU$: {kind: "const", value: "Dodatkowy opis"},
      zrodloInfOPoradniU$: [{kind: "nn", nn: "źródło informacji:inne"}],
    },
  },
  {
    nn: "p. westenra",
    name: "p. Westenra",
    client: {
      typeDictId: {kind: "dict", dictName: "clientType", positionName: "adult"},
      genderDictId: {kind: "dict", dictName: "gender", positionName: "female"},
      contactEmail: {kind: "const", value: "wwwestenra@example.com"},
      addressCity: {kind: "const", value: "Hampstead"},
      anyFieldsU$: {kind: "const", value: "Dodatkowy opis"},
    },
  },
  {
    nn: "jonathan",
    name: "Jonathan Harker",
    client: {
      typeDictId: {kind: "dict", dictName: "clientType", positionName: "adult"},
      genderDictId: {kind: "dict", dictName: "gender", positionName: "male"},
      contactEmail: {kind: "const", value: "joharker@example.com"},
      addressCity: {kind: "const", value: "Exeter"},
      powodZgloszeniaU$: [{kind: "nn", nn: "powód zgłoszenia:przemoc psychiczna"}],
      documentsLinks: {kind: "const", value: ["opis (ang.): https://en.wikipedia.org/wiki/Jonathan_Harker"]},
      zrodloInfOPoradniU$: [{kind: "nn", nn: "źródło informacji:media"}],
    },
  },
];

const clientGroups: ClientGroup[] = [
  {
    clients: [
      {clientNn: "lucy", role: null},
      {clientNn: "p. westenra", role: "matka"},
    ],
    notes: null,
  },
];

const BASE_MONDAY = DateTime.fromISO("2024-09-30");

function workTime(
  staff: string | undefined,
  day: luxon.WeekdayNumbers,
  [fromHour, toHour]: readonly [number, number],
  overrides: Partial<Meeting> = {},
) {
  return {
    typeDictNnOrName: "work_time",
    isRemote: false,
    date: BASE_MONDAY.plus({days: day - 1}).toISODate(),
    startDayMinute: Math.round(60 * fromHour),
    durationMinutes: Math.round(60 * (toHour - fromHour)),
    status: "planned",
    staff: staff ? [{userNn: staff, attendanceStatus: "ok"}] : [],
    clients: [],
    ...overrides,
  } satisfies Meeting;
}

const meetings: Meeting[] = [
  {
    typeDictNnOrName: "meetingType:Terapia indywidualna",
    isRemote: false,
    notes: "Problem definitywnie rozwiązany.",
    date: "1893-09-28",
    startDayMinute: 20 * 60,
    durationMinutes: 60,
    status: "completed",
    staff: [
      {userNn: "abrahamvh@example.com", attendanceStatus: "ok"},
      {userNn: "dr.john.seward@example.com", attendanceStatus: "ok"},
      {userNn: "godalming@example.com", attendanceStatus: "ok"},
    ],
    clients: [{userNn: "lucy", attendanceStatus: "ok"}],
  },
  workTime(undefined, 1, [8, 17]),
  workTime(undefined, 2, [8, 17]),
  workTime(undefined, 3, [8, 17]),
  workTime(undefined, 4, [8, 17]),
  workTime(undefined, 5, [8, 17]),
  workTime("mina.m@example.com", 1, [9, 15]),
  workTime("mina.m@example.com", 2, [9, 15]),
  workTime("mina.m@example.com", 3, [9, 15]),
  workTime("mina.m@example.com", 4, [9, 15]),
  workTime("mina.m@example.com", 5, [9, 15]),
  workTime("abrahamvh@example.com", 1, [9, 12]),
  workTime("abrahamvh@example.com", 1, [15, 21]),
  workTime("abrahamvh@example.com", 2, [9, 17]),
  workTime("abrahamvh@example.com", 3, [12, 14]),
  workTime("abrahamvh@example.com", 5, [9, 15]),
  workTime("dr.john.seward@example.com", 1, [9, 15]),
  workTime("dr.john.seward@example.com", 2, [9, 13]),
  workTime("dr.john.seward@example.com", 3, [9, 16]),
  workTime("dr.john.seward@example.com", 4, [9, 16]),
  workTime("dr.john.seward@example.com", 5, [10, 13]),
  workTime("godalming@example.com", 2, [7, 15]),
  workTime("godalming@example.com", 3, [8, 15]),
  workTime("godalming@example.com", 5, [15, 17]),
];

const facilityContents: FacilityContents = {
  dictionariesAndAttributes,
  facilityStaff,
  clients,
  clientGroups,
  meetings,
};

console.log("Prepared data:");
console.log(facilityContentStats(facilityContents));

console.log(`Writing result to ${OUT_PATH}`);
Deno.writeTextFileSync(OUT_PATH, JSON.stringify(facilityContents, undefined, 2));
console.log("Done");
