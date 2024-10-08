/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import * as fs from "jsr:@std/fs";
import {parseArgs} from "jsr:@std/cli";
import * as csv from "jsr:@std/csv";
import {DateTimeOptions} from "https://esm.sh/luxon@latest";
import {
  Client,
  CreateDictionaryAction,
  FacilityContents,
  facilityContentStats,
  Meeting,
  NnAttributeValue,
  FacilityStaff,
} from "../facility_contents_type.ts";
import luxon from "../luxon.ts";
import {dictionariesAndAttributes, MEETING_TYPES} from "./dicts_and_attribs.ts";

const {DateTime} = luxon;
type DateTime = luxon.DateTime;

const params = parseArgs(Deno.args, {
  string: ["exports-dir", "static-data-dir", "out"],
});

function getParam<N extends string & keyof typeof params>({
  name,
  desc,
  check,
}: {
  name: N;
  desc: string;
  check?: (value: NonNullable<(typeof params)[N]>) => boolean;
}) {
  const value = params[name];
  if (value == undefined || (check && !check(value))) {
    console.error(`Provide ${desc} as --${name}`);
    Deno.exit(1);
  }
  return value;
}

console.log("Params:", params);
const exportsDir = getParam({
  name: "exports-dir",
  desc: "path to directory with data exported from salesforce",
  check: fs.existsSync,
});
const staticDataDir = getParam({
  name: "static-data-dir",
  desc: "path to directory with static data",
  check: fs.existsSync,
});
const outPath = getParam({name: "out", desc: "path to output file"});

type FieldsType<T extends string[]> = T[number];

// prettier-ignore
interface FilesType {
  klienci: FieldsType<["ID","imię","nazwisko","email","numer PESEL","numer karty","Saldo klienta","telefon komórkowy","telefon stacjonarny","płeć","adres","kod pocztowy","miasto","data urodzenia","data imienin (dzień i miesiąc)","opis","sformatowany opis","pochodzenie klienta (źródło)","status pochodzenia klienta","przypomnienie SMS","przypomnienie email","wysyłka masowa SMS","wysyłka masowa email","Marketing Automatyczny SMS","Marketing Automatyczny email","życzenia urodzinowe/imieninowe SMS","życzenia urodzinowe/imieninowe email","Program Lojalnościowy SMS","Program Lojalnościowy email","opinie SMS","opinie email","dodany dnia","zgoda handlowa","status programu lojalnościowego","punkty programu lojalnościowego","Maksymalna liczba rezerwacji online","zdefiniowane: Relacje","zdefiniowane: Dorosły/Dziecko","zdefiniowane: Wiek w momencie zgłoszenia","zdefiniowane: Powód zgłoszenia","zdefiniowane: Sprawca","zdefiniowane: Płeć sprawcy","zdefiniowane: Data zgłoszenia","zdefiniowane: Data pierwszej konsultacji","zdefiniowane: Kontakt zakończony","zdefiniowane: Notatka o kliencie","zdefiniowane: Problem alkoholowy"]>,
  terminy: FieldsType<["ID wizyty","ID relacji usługa/wizyta","pracownik","początek","koniec","imię klienta","nazwisko klienta","telefon komórkowy","email","ID klienta","ID usługi","usługa","czas trwania","powiązane zasoby","sugerowana cena (PLN)","zapłacono (PLN)","status","forma płatności","dodana przez","etykiety","data dodania","data ostatniej modyfikacji","autor ostatniej modyfikacji","data finalizacji","sfinalizowane przez","dodatkowy opis","numer rezerwacji"]>,
}

type Row<K extends string> = {readonly [k in K]: string};

interface FileData<R> {
  readonly rows: readonly R[];
  has(id: string): boolean;
  get(id: string): R;
}

function readCSV<K extends string>(file: string, idField: K): FileData<Row<K>> {
  const rows = readRawCSV<K>(file);
  const map = new Map<string, Row<K>>();
  for (const row of rows) {
    map.set(row[idField], row);
  }
  return {
    rows,
    has: (id) => map.has(id),
    get: (id) => {
      const row = map.get(id);
      if (!row) {
        throw new Error(`Row with ${idField}='${id}' not found in ${file}`);
      }
      return row;
    },
  };
}

function readRawCSV<K extends string>(file: string): Row<K>[] {
  return csv.parse(Deno.readTextFileSync(file), {skipFirstRow: true}) as unknown as Row<K>[];
}

console.log(`Reading export data from ${exportsDir}`);

let KLIENCI = readCSV<FilesType["klienci"]>(`${exportsDir}/klienci_143413.csv`, "ID");
let TERMINY = readCSV<FilesType["terminy"]>(`${exportsDir}/terminy_143413.csv`, "ID wizyty");

console.log(`Reading static data from ${staticDataDir}`);

const STAFF = readCSV<
  | "Imię i nazwisko"
  | "Adres email"
  | "Może logować się do Memo?"
  | "Posiada własny kalendarz spotkań w Memo?"
  | "Jest aktualnym pracownikiem?"
  | "Jest administratorem z dostępem do raportów itp.?"
>(`${staticDataDir}/staff.csv`, "Adres email");

console.log("Analysing data");

function rejectAndLog<R>(data: FileData<R>, rejectIf: (item: R) => boolean, logLine: string): FileData<R> {
  const accepted = data.rows.filter((e) => !rejectIf(e));
  const rejected = data.rows.length - accepted.length;
  if (rejected) {
    console.log(`  ${logLine}: ${rejected}`);
    return {...data, rows: accepted};
  }
  return data;
}

console.log(`Liczba wyeksportowanych klientów: ${KLIENCI.rows.length}`);
KLIENCI = rejectAndLog(KLIENCI, (k) => k.imię === "(konto" && k.nazwisko === "usunięte)", "Usunięte konta");
console.log(`Liczba prawidłowych klientów: ${KLIENCI.rows.length}`);

console.log(`Liczba wyeksportowanych spotkań: ${TERMINY.rows.length}`);
TERMINY = rejectAndLog(TERMINY, (t) => !t.pracownik, "Spotkania bez pracownika");
console.log(`Liczba prawidłowych spotkań: ${TERMINY.rows.length}`);

function tt(text: string) {
  let t = text;
  for (;;) {
    const t1 = t.replaceAll(/<([a-z1-6]*\b)[\s\S]*?(?:>([\s\S]*?)<\/\1>|\/>)/g, (_mat, tag, content = "") =>
      tag === "br" ? "\n" : tag === "p" || tag === "div" ? content + "\n" : content,
    );
    if (t1 === t) {
      break;
    }
    t = t1;
  }
  return (
    t
      // The only entities that actually appear in the data:
      .replaceAll("&nbsp;", " ")
      .replaceAll("&oacute;", "ó")
      .replaceAll("&ouml;", "ö")
      .replaceAll("&quot;", '"')
      .replaceAll(/ +/g, " ")
      .replaceAll(/ *\n */g, "\n")
      .trim()
  );
}

function _logFreq(values: unknown[], {sep = "\t", limit}: {sep?: string; limit?: number} = {}) {
  const freq = new Map<unknown, number>();
  for (const v of values) {
    freq.set(v, (freq.get(v) || 0) + 1);
  }
  let i = 0;
  for (const [v, c] of [...freq].sort((a, b) => b[1] - a[1])) {
    console.debug(`${v}${sep}${c}`);
    i++;
    if (limit && i >= limit) {
      break;
    }
  }
}

let logLineLimit = 100;
function _logLine(...line: unknown[]) {
  console.debug(...line);
  if (logLineLimit-- <= 0) {
    console.debug("...");
    Deno.exit();
  }
}

// _logFreq(
//   TERMINY.rows.flatMap((r) => r.etykiety.split(", ")),
//   {limit: 100},
// );
// Deno.exit();

const facilityStaff: FacilityStaff[] = STAFF.rows.map((row) => ({
  nn: row["Imię i nazwisko"],
  name: row["Imię i nazwisko"],
  email: row["Adres email"] || null,
  ...(row["Może logować się do Memo?"] === "tak"
    ? {
        password: "Memo2024",
        passwordExpireAt: DateTime.now().startOf("day").plus({weeks: 1}),
      }
    : {password: null, passwordExpireAt: null}),
  isStaff: row["Posiada własny kalendarz spotkań w Memo?"] === "tak",
  isAdmin: row["Jest administratorem z dostępem do raportów itp.?"] === "tak",
  deactivatedAt: row["Jest aktualnym pracownikiem?"] === "nie" ? DateTime.now().startOf("month") : null,
}));

function dateTimeFromFormats(s: string, formats: string[], opts?: DateTimeOptions) {
  for (const f of formats) {
    try {
      return DateTime.fromFormat(s, f, opts);
    } catch (_e) {
      // Ignore
    }
  }
  return DateTime.fromFormat(s, formats[0], opts);
}

function parseDateTime(s: string, opts?: DateTimeOptions) {
  return dateTimeFromFormats(s, ["yyyy-MM-dd H:mm:ss ZZZ", "yyyy-MM-dd H:mm"], opts);
}

function parseDateDDMMYYYY(s: string) {
  return dateTimeFromFormats(s.trim(), ["d.MM.yyyy", "d.MM.yyyy.", "d.MM.yy", "d.MM.yy.", "yyyy-MM-dd"]);
}

const clients: Client[] = [];
const meetings: Meeting[] = [];

function customDictGetter(dictName: string, mapping?: Record<string, string>) {
  const poss = dictionariesAndAttributes.find(
    (a): a is CreateDictionaryAction => a.kind === "createDictionary" && a.nn === `dict:${dictName}`,
  )?.positions;
  if (!poss) {
    throw new Error(`Dictionary ${JSON.stringify(dictName)} not found`);
  }
  function req(val: string) {
    val = val.trim();
    val = mapping?.[val] ?? val;
    const pos = poss!.find((p) => p.nn === `${dictName}:${val}`);
    if (!pos) {
      throw new Error(`Position ${JSON.stringify(val)} not found in dictionary ${JSON.stringify(dictName)}`);
    }
    return {kind: "nn", nn: pos.nn!} satisfies NnAttributeValue;
  }
  function opt(val: string) {
    val = val.trim();
    if (!val) {
      return undefined;
    }
    return req(val);
  }
  return {opt, req, values: poss.map((p) => p.name.slice(1))};
}

const deletedClients = new Set<string>(TERMINY.rows.map((t) => t["ID klienta"]));
deletedClients.delete("");
for (const klient of KLIENCI.rows) {
  deletedClients.delete(klient.ID);
}
console.log(`Usunięci klienci do dodania: ${deletedClients.size}`);

for (const klientId of deletedClients) {
  clients.push({
    nn: klientId,
    name: "🗑 (klient usunięty)",
    client: {
      typeDictId: {
        kind: "dict",
        dictName: "clientType",
        positionName: "adult",
      },
      shortCode: {kind: "const", value: "-"},
      notes: {kind: "const", value: `Klient usunięty w Versum, ID=${klientId}`},
    },
  });
}

for (const klient of KLIENCI.rows) {
  const terminy = TERMINY.rows
    .filter((t) => t["ID klienta"] === klient.ID)
    .sort((a, b) => parseDateTime(a.początek).toMillis() - parseDateTime(b.początek).toMillis());
  const powódZgłoszeniaGetter = customDictGetter("powód zgłoszenia");
  const sprawcaGetter = customDictGetter("sprawca");
  let type;
  if (klient["zdefiniowane: Dorosły/Dziecko"] === "Dziecko") {
    type = "child";
  } else if (klient["zdefiniowane: Dorosły/Dziecko"] === "Dorosły") {
    type = "adult";
  } else if (klient["data urodzenia"]) {
    const birth = DateTime.fromISO(klient["data urodzenia"]);
    const ref = klient["zdefiniowane: Data zgłoszenia"]
      ? parseDateDDMMYYYY(klient["zdefiniowane: Data zgłoszenia"])
      : DateTime.fromISO("2024-01-01");
    const age = ref.diff(birth, "years").years;
    type = age < 18 ? "child" : "adult";
  } else {
    type = "adult";
  }
  const links = [];
  const notesFromLinks = [];
  for (const linksLine of tt(klient["zdefiniowane: Notatka o kliencie"]).split("\n").filter(Boolean)) {
    if (linksLine.startsWith("http")) {
      links.push(linksLine);
    } else {
      notesFromLinks.push(linksLine);
    }
  }
  const notes = [
    tt(klient["opis"]),
    tt(klient["telefon stacjonarny"]) ? `Telefon stacjonarny: ${tt(klient["telefon stacjonarny"])}` : undefined,
    notesFromLinks.join("\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  clients.push({
    nn: klient.ID,
    name: tt(`${klient.imię} ${klient.nazwisko}`),
    createdAt: parseDateTime(klient["dodany dnia"]),
    client: {
      typeDictId: {
        kind: "dict",
        dictName: "clientType",
        positionName: type,
      },
      genderDictId: {
        kind: "dict",
        dictName: "gender",
        positionName: klient["płeć"] === "Kobieta" ? "female" : klient["płeć"] === "Mężczyzna" ? "male" : "unknown",
      },
      birthDate: klient["data urodzenia"]
        ? {kind: "const", value: DateTime.fromISO(klient["data urodzenia"]).toISODate()}
        : undefined,
      wiekWMomencieZgloszeniaU$: klient["zdefiniowane: Wiek w momencie zgłoszenia"]
        ? {kind: "const", value: parseInt(klient["zdefiniowane: Wiek w momencie zgłoszenia"])}
        : undefined,
      contactPhone: {kind: "const", value: klient["telefon komórkowy"]},
      contactEmail: {kind: "const", value: klient["email"]},
      addressStreetNumber: {kind: "const", value: tt(klient.adres)},
      addressPostalCode: {kind: "const", value: tt(klient["kod pocztowy"])},
      addressCity: {kind: "const", value: tt(klient.miasto)},
      contactStartAt: klient["zdefiniowane: Data zgłoszenia"]
        ? {
            kind: "const",
            value: parseDateDDMMYYYY(klient["zdefiniowane: Data zgłoszenia"]).toISODate(),
          }
        : undefined,
      contactEndAt: klient["zdefiniowane: Kontakt zakończony"]
        ? {
            kind: "const",
            value: (terminy.length
              ? parseDateTime(terminy.at(-1)!.początek)
              : klient["zdefiniowane: Data zgłoszenia"]
                ? parseDateDDMMYYYY(klient["zdefiniowane: Data zgłoszenia"])
                : undefined
            )
              // TODO: What else?
              ?.toISODate(),
          }
        : undefined,
      powodZgloszeniaU$: klient["zdefiniowane: Powód zgłoszenia"]
        .split(", ")
        .filter(Boolean)
        .map(powódZgłoszeniaGetter.req),
      sprawcaU$: klient["zdefiniowane: Sprawca"].split(", ").filter(Boolean).map(sprawcaGetter.req),
      plecSprawcyU$: klient["zdefiniowane: Płeć sprawcy"]
        .split(", ")
        .filter(Boolean)
        .map((p) => ({
          kind: "dict",
          dictName: "gender",
          positionName: p === "kobieta" ? "female" : p === "mężczyzna" ? "male" : "unknown",
        })),
      shortCode: {kind: "const", value: klient["numer karty"]},
      relacjeU$: tt(klient["zdefiniowane: Relacje"])
        .split("\n")
        .filter(Boolean)
        .map((r) => ({kind: "const", value: r})),
      rodzinaZProblememAlkoholowymU$: {
        kind: "const",
        value: !!klient["zdefiniowane: Problem alkoholowy"],
      },
      // TODO: Enable when the limit is lifted.
      // documentsLinks: {
      //   kind: "const",
      //   value: links.length <= 1 ? links.map((l) => `dokumentacja: ${l}`) : links,
      // },
      notes: {
        kind: "const",
        value: notes,
      },
      zrodloInfOPoradniU$:
        klient["pochodzenie klienta (źródło)"].toLowerCase() === "facebook"
          ? [{kind: "nn", nn: "źródło informacji:internet"}]
          : [],
    },
  });
}

function intervalBetween(d1: string, d2: string) {
  const numDays = parseDateTime(d2).diff(parseDateTime(d1), "days").days;
  return [1, 7, 14].includes(numDays) ? `${numDays}d` : undefined;
}

const pracownicyCache = new Map<string, string>();
function getStaff(pracownik: string) {
  let staffNn = pracownicyCache.get(pracownik);
  const name = tt(pracownik);
  if (!staffNn) {
    const staff = STAFF.rows.find((staff) => staff["Imię i nazwisko"] === name);
    if (!staff) {
      throw new Error(`Staff ${JSON.stringify(name)} not found`);
    }
    staffNn = staff["Imię i nazwisko"];
    pracownicyCache.set(pracownik, staffNn);
  }
  return staffNn;
}

const ETYKIETY = {
  obecny: "obecny",
  osobista: "konsultacja osobista",
  zdalna: "konsultacja zdalna",
  pracownikOdwołał: "Odwołana przez pracownika",
  klientOdwołał: "Odwołana przez klienta",
  klientNiePrzyszedł: "klient nie przyszedł",
  pierwsza: "pierwsza wizyta",
};

const meetingTypes = MEETING_TYPES.flatMap((c) => c.types.map((t) => t.name));
function meetingTypeNn(typeName: string) {
  const [mappedTypeName, retainUsługa = false] = meetingTypeMapping.get(typeName) || [typeName];
  if (mappedTypeName !== "other" && !meetingTypes.includes(mappedTypeName)) {
    throw new Error(`Meeting type ${JSON.stringify(typeName)} (mapped as ${JSON.stringify(mappedTypeName)}) not found`);
  }
  return [
    mappedTypeName === "other" ? mappedTypeName : `meetingType:${mappedTypeName}`,
    retainUsługa ? typeName : undefined,
  ] as const;
}

const meetingTypeMapping = new Map<string, [type: string, retain?: boolean]>([
  ["Konsultacja psychologiczna DOROSŁY", ["Konsultacja psychologiczna"]],
  ["Konsultacja psychologiczna DZIECKO", ["Konsultacja psychologiczna"]],
  ["Terapia indywidualna DOROSŁY", ["Terapia indywidualna"]],
  ["Terapia indywidualna DZIECKO", ["Terapia indywidualna"]],
  ["Konsultacja pierwszorazowa DOROSŁY", ["Konsultacja pierwszorazowa"]],
  ["Konsultacja pierwszorazowa DZIECKO", ["Konsultacja pierwszorazowa"]],
  ["Konsultacja prawna klient", ["Konsultacja prawna – klient"]],
  ["Konsultacja prawna profesjonalista", ["Konsultacja prawna – profesjonalista"]],
  ["Konsultacja psychiatryczna DZIECKO", ["Konsultacja psychiatryczna"]],
  ["Infolinia dla Kuratorów", ["other", true]],
  ["Interwencja kryzysowa- zewnętrzna ", ["other", true]],
  ["Blokada terminu", ["Czynności służbowe", true]],
]);

const unknownMeetingTypes = new Map<string, number>();
for (const termin of TERMINY.rows) {
  if (termin.usługa && !meetingTypes.includes(termin.usługa) && !meetingTypeMapping.has(termin.usługa)) {
    unknownMeetingTypes.set(termin.usługa, (unknownMeetingTypes.get(termin.usługa) || 0) + 1);
  }
}
if (unknownMeetingTypes.size) {
  console.log("Nieznane typy:");
  for (const [type, count] of [...unknownMeetingTypes].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${JSON.stringify(type)}\t(${count})`);
  }
  Deno.exit();
}

for (let i = 0; i < TERMINY.rows.length; i++) {
  const termin = TERMINY.rows[i];
  const prevTermin = i ? TERMINY.rows[i - 1] : undefined;
  const isSeries =
    termin["data dodania"] === prevTermin?.["data dodania"] &&
    termin["dodana przez"] === prevTermin["dodana przez"] &&
    termin["pracownik"] === prevTermin["pracownik"] &&
    termin["ID klienta"] === prevTermin["ID klienta"];
  const etykiety = new Set(termin.etykiety.split(", ").filter(Boolean));
  const staffNn = getStaff(termin.pracownik);
  let start = parseDateTime(termin.początek);
  const [meetingTypeNnOrName, notesPrefix = undefined] = termin.usługa ? meetingTypeNn(termin.usługa) : ["other"];
  const meeting = {
    nn: termin["ID relacji usługa/wizyta"],
    typeDictNnOrName: meetingTypeNnOrName,
    isRemote: etykiety.has(ETYKIETY.zdalna),
    notes: [notesPrefix?.trim(), tt(termin["dodatkowy opis"])].filter(Boolean).join("\n"),
    date: start.toISODate(),
    startDayMinute: start.hour * 60 + start.minute,
    durationMinutes: Number(termin["czas trwania"]),
    status: termin.status === "Oczekująca" ? "planned" : termin.status === "Sfinalizowana" ? "completed" : "cancelled",
    staff: [{userNn: staffNn, attendanceStatus: etykiety.has(ETYKIETY.pracownikOdwołał) ? "cancelled" : "ok"}],
    clients: termin["ID klienta"]
      ? [
          {
            userNn: termin["ID klienta"],
            attendanceStatus: etykiety.has(ETYKIETY.klientOdwołał)
              ? "cancelled"
              : etykiety.has(ETYKIETY.klientNiePrzyszedł)
                ? "no_show"
                : "ok",
          },
        ]
      : [],
    ...(isSeries
      ? {
          fromMeetingNn: prevTermin["ID relacji usługa/wizyta"],
          interval: intervalBetween(prevTermin["początek"], termin["początek"]),
        }
      : undefined),
    createdAt: parseDateTime(termin["data dodania"], {zone: "UTC"}),
    createdByNn: getStaff(termin["dodana przez"]),
    updatedAt: parseDateTime(termin["data ostatniej modyfikacji"], {zone: "UTC"}),
    updatedByNn: getStaff(termin["autor ostatniej modyfikacji"]),
  } satisfies Meeting;
  const multiDayParts: Meeting[] = [];
  while (meeting.durationMinutes > 24 * 60) {
    multiDayParts.push({
      fromMeetingNn: termin["ID relacji usługa/wizyta"],
      ...meeting,
      interval: "1d",
      nn: `${meeting.nn}-${meeting.date}`,
      durationMinutes: 24 * 60,
    });
    start = start.plus({days: 1});
    meeting.date = start.toISODate();
    meeting.durationMinutes -= 24 * 60;
  }
  meetings.push(meeting, ...multiDayParts);
}

const facilityContents: FacilityContents = {
  dictionariesAndAttributes,
  facilityStaff,
  clients,
  meetings,
};

console.log("Prepared data:");
console.log(facilityContentStats(facilityContents));

console.log(`Writing result to ${outPath}`);
Deno.writeTextFileSync(outPath, JSON.stringify(facilityContents, undefined, 2));
console.log("Done");
