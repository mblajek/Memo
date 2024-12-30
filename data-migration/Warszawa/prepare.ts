/// <reference lib="deno.ns" />
/// <reference lib="dom" />

import {DateTimeOptions} from "https://esm.sh/luxon@latest";
import {parseArgs} from "jsr:@std/cli";
import * as csv from "jsr:@std/csv";
import * as fs from "jsr:@std/fs";
import type {AttributeValue, ConstAttributeValue} from "../facility_contents_type.ts";
import {
  Client,
  CreateDictionaryAction,
  FacilityContents,
  facilityContentStats,
  FacilityStaff,
  Meeting,
  NnAttributeValue,
} from "../facility_contents_type.ts";
import luxon from "../luxon.ts";
import {dictionariesAndAttributes, MEETING_TYPES, POKOJE} from "./dicts_and_attribs.ts";

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
const outPaths = getParam({name: "out", desc: "path to output file, or multiple comma-separated paths"})
  .split(",")
  .map((path) => path.trim());

type FieldsType<T extends string[]> = T[number];

// prettier-ignore
interface FilesType {
  klienci: FieldsType<["ID","imię","nazwisko","email","numer PESEL","numer karty","Saldo klienta","telefon komórkowy","telefon stacjonarny","płeć","adres","kod pocztowy","miasto","data urodzenia","data imienin (dzień i miesiąc)","opis","sformatowany opis","pochodzenie klienta (źródło)","status pochodzenia klienta","przypomnienie SMS","przypomnienie email","wysyłka masowa SMS","wysyłka masowa email","Marketing Automatyczny SMS","Marketing Automatyczny email","życzenia urodzinowe/imieninowe SMS","życzenia urodzinowe/imieninowe email","Program Lojalnościowy SMS","Program Lojalnościowy email","opinie SMS","opinie email","dodany dnia","zgoda handlowa","status programu lojalnościowego","punkty programu lojalnościowego","Maksymalna liczba rezerwacji online","zgoda 197648","grupa 1","grupa 2","grupa 3","grupa 4","grupa 5","grupa 6","zdefiniowane: Klient","zdefiniowane: Relacje","zdefiniowane: Mail","zdefiniowane: Dzielnica","zdefiniowane: Dorosły/Dziecko","zdefiniowane: Wiek w momencie zgłoszenia","zdefiniowane: Powód zgłoszenia","zdefiniowane: Sprawca","zdefiniowane: Płeć sprawcy","zdefiniowane: Data zgłoszenia","zdefiniowane: Data pierwszej konsultacji","zdefiniowane: Kontakt zakończony?","zdefiniowane: Notatka o kliencie"]>,
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

let KLIENCI = readCSV<FilesType["klienci"]>(`${exportsDir}/klienci_69408.csv`, "ID");
let TERMINY = readCSV<FilesType["terminy"]>(`${exportsDir}/terminy_69408.csv`, "ID wizyty");

console.log(`Reading static data from ${staticDataDir}`);

const STAFF = readCSV<
  | "Imię i nazwisko"
  | "Adres email"
  | "Może logować się do Memo?"
  | "Posiada własny kalendarz spotkań w Memo?"
  | "Jest aktualnym pracownikiem?"
  | "Jest administratorem z dostępem do raportów itp.?"
  | "Istnieje już w Memo z tym adresem email?"
>(`${staticDataDir}/staff.csv`, "Adres email");

console.log("Analysing data");

function rejectAndLog<R>(data: FileData<R>, rejectIf: (item: R) => boolean, logLine: string): FileData<R> {
  const accepted = data.rows.filter((e) => !rejectIf(e));
  const rejected = data.rows.length - accepted.length;
  console.log(`  ${logLine}: ${rejected}`);
  if (rejected) {
    return {...data, rows: accepted};
  }
  return data;
}

console.log(`Liczba wyeksportowanych klientów: ${KLIENCI.rows.length}`);
KLIENCI = rejectAndLog(KLIENCI, (k) => k.imię === "(konto" && k.nazwisko === "usunięte)", "Usunięte konta");
console.log(`Liczba prawidłowych klientów: ${KLIENCI.rows.length}`);

console.log(`Liczba wyeksportowanych spotkań: ${TERMINY.rows.length}`);
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
  ...(row["Istnieje już w Memo z tym adresem email?"] === "tak"
    ? {
        existing: true,
        email: row["Adres email"]!,
      }
    : {
        name: row["Imię i nazwisko"],
        email: row["Adres email"] || null,
        ...(row["Może logować się do Memo?"] === "tak"
          ? {
              password: "Memo2024",
              passwordExpireAt: DateTime.now().startOf("day").plus({weeks: 1}),
            }
          : {password: null, passwordExpireAt: null}),
        deactivatedAt: row["Jest aktualnym pracownikiem?"] === "nie" ? DateTime.now().startOf("month") : null,
      }),
  isStaff: row["Posiada własny kalendarz spotkań w Memo?"] === "tak",
  isAdmin: row["Jest administratorem z dostępem do raportów itp.?"] === "tak",
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
      typeDictId: {kind: "dict", dictName: "clientType", positionName: "adult"},
      placowkaU$: [{kind: "nn", nn: "placowka:Centrum Pomocy Dzieciom"}],
      shortCode: {kind: "const", value: "-"},
      notes: {kind: "const", value: `Klient usunięty w Versum, ID=${klientId}`},
    },
  });
}

const CLIENT_TYPES = {
  child: {kind: "dict", dictName: "clientType", positionName: "child"},
  adult: {kind: "dict", dictName: "clientType", positionName: "adult"},
  profesjonalista: {kind: "nn", nn: "clientType:profesjonalista"},
} satisfies Record<string, AttributeValue>;

const EMAIL_CODES_MAPPING: Partial<Record<string, string>> = {
  poza: "spoza",
  profejsonalista: "profesjonalista",
  warszaw: "warszawa",
};
const VALID_EMAIL_CODES = ["profesjonalista", "warszawa", "spoza"];

for (const klient of KLIENCI.rows) {
  const terminy = TERMINY.rows
    .filter((t) => t["ID klienta"] === klient.ID)
    .sort((a, b) => parseDateTime(a.początek).toMillis() - parseDateTime(b.początek).toMillis());
  const dzielnicaWarszawyGetter = customDictGetter("dzielnica Warszawy");
  const powódZgłoszeniaGetter = customDictGetter("powód zgłoszenia");
  const sprawcaGetter = customDictGetter("sprawca", {
    "34349": "osoba z rodziny",
    "34350": "osoba spoza rodziny znana dziecku",
    "34351": "osoba spoza rodziny nieznana dziecku",
  });
  let emails = [tt(klient["zdefiniowane: Mail"])].filter(Boolean);
  let emailCode;
  if (klient.email) {
    const email = tt(klient.email);
    if (email.includes("@fdds.pl")) {
      emailCode = email.slice(0, email.indexOf("@fdds.pl"));
      emailCode = EMAIL_CODES_MAPPING[emailCode] || emailCode;
      if (!VALID_EMAIL_CODES.includes(emailCode)) {
        throw new Error(`Unknown email code: ${email}`);
      }
    } else {
      emails.push(email);
    }
  }
  emails = [...new Set(emails.filter(Boolean))];

  let type: AttributeValue;
  if (emailCode === "profesjonalista") {
    type = CLIENT_TYPES.profesjonalista;
  } else if (klient["zdefiniowane: Dorosły/Dziecko"] === "Dziecko") {
    type = CLIENT_TYPES.child;
  } else if (klient["zdefiniowane: Dorosły/Dziecko"] === "Dorosły") {
    type = CLIENT_TYPES.adult;
  } else if (klient["data urodzenia"]) {
    const birth = DateTime.fromISO(klient["data urodzenia"]);
    const ref = klient["zdefiniowane: Data zgłoszenia"]
      ? parseDateDDMMYYYY(klient["zdefiniowane: Data zgłoszenia"])
      : DateTime.fromISO("2024-01-01");
    const age = ref.diff(birth, "years").years;
    type = age < 18 ? CLIENT_TYPES.child : CLIENT_TYPES.adult;
  } else {
    type = CLIENT_TYPES.adult;
  }
  let wiekWMomencieZgłoszenia: number | undefined;
  if (klient["zdefiniowane: Wiek w momencie zgłoszenia"]) {
    wiekWMomencieZgłoszenia = parseInt(klient["zdefiniowane: Wiek w momencie zgłoszenia"]);
  } else if (klient["data urodzenia"] && klient["zdefiniowane: Data zgłoszenia"]) {
    const birth = DateTime.fromISO(klient["data urodzenia"]);
    const contactStart = parseDateDDMMYYYY(klient["zdefiniowane: Data zgłoszenia"]);
    if (contactStart > birth) {
      wiekWMomencieZgłoszenia = Math.floor(contactStart.diff(birth, "years").years);
    }
  }
  const miasto =
    emailCode === "warszawa" && (!tt(klient.miasto) || tt(klient.miasto).toLocaleLowerCase().startsWith("warsz"))
      ? "Warszawa"
      : tt(klient.miasto);
  const placówki = klient["zdefiniowane: Klient"].trim().split(", ").filter(Boolean);
  if (!placówki.length) {
    if (tt(klient.adres)) {
      placówki.push("Centrum Pomocy Dzieciom");
    } else if (emailCode === "profesjonalista") {
      placówki.push("Centrum Pomocy Dzieciom");
    } else {
      placówki.push("Poradnia Dziecko w Sieci");
    }
  }

  const notes = [
    tt(klient["opis"]),
    tt(klient["zdefiniowane: Notatka o kliencie"]),
    tt(klient["telefon stacjonarny"]) ? `Telefon stacjonarny: ${tt(klient["telefon stacjonarny"])}` : undefined,
    emails.length > 1 ? `Inny adres email: ${emails[1]}` : undefined,
  ]
    .filter(Boolean)
    .join("\n\n");

  clients.push({
    nn: klient.ID,
    name: tt(`${tt(klient.imię)} ${tt(klient.nazwisko)}`),
    createdAt: parseDateTime(klient["dodany dnia"]),
    client: {
      placowkaU$: placówki.map((p) => ({kind: "nn", nn: `placowka:${p}`})),
      typeDictId: type,
      genderDictId: {
        kind: "dict",
        dictName: "gender",
        positionName: klient["płeć"] === "Kobieta" ? "female" : klient["płeć"] === "Mężczyzna" ? "male" : "unknown",
      },
      birthDate: klient["data urodzenia"]
        ? {kind: "const", value: DateTime.fromISO(klient["data urodzenia"]).toISODate()}
        : undefined,
      wiekWMomencieZgloszeniaU$: wiekWMomencieZgłoszenia ? {kind: "const", value: wiekWMomencieZgłoszenia} : undefined,
      contactPhone: {kind: "const", value: tt(klient["telefon komórkowy"])},
      contactEmail: emails.length ? {kind: "const", value: emails[0]} : undefined,
      addressStreetNumber: {kind: "const", value: tt(klient.adres)},
      addressPostalCode: {kind: "const", value: tt(klient["kod pocztowy"])},
      addressCity: {kind: "const", value: miasto},
      dzielnicaWarszawyU$:
        klient["zdefiniowane: Dzielnica"] === "spoza Warszawy"
          ? undefined
          : dzielnicaWarszawyGetter.opt(klient["zdefiniowane: Dzielnica"]),
      contactStartAt: klient["zdefiniowane: Data zgłoszenia"]
        ? {
            kind: "const",
            value: parseDateDDMMYYYY(klient["zdefiniowane: Data zgłoszenia"]).toISODate(),
          }
        : undefined,
      contactEndAt: klient["zdefiniowane: Kontakt zakończony?"]
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
          positionName:
            p === "kobieta" || p === "34352" ? "female" : p === "mężczyzna" || p === "34353" ? "male" : "unknown",
        })),
      shortCode: {kind: "const", value: klient["numer karty"]},
      relacjeU$: tt(klient["zdefiniowane: Relacje"])
        .split("\n")
        .filter(Boolean)
        .map((r) => ({kind: "const", value: r})),
      notes: {
        kind: "const",
        value: notes,
      },
    },
  });
}
clients.sort(
  (a, b) =>
    ((a.client.shortCode as ConstAttributeValue | undefined)?.value ? 0 : 1) -
    ((b.client.shortCode as ConstAttributeValue | undefined)?.value ? 0 : 1),
);

function intervalBetween(d1: string, d2: string) {
  const numDays = parseDateTime(d2).diff(parseDateTime(d1), "days").days;
  return [1, 7, 14].includes(numDays) ? `${numDays}d` : undefined;
}

const pracownicyCache = new Map<string, string>();
function getStaff(pracownik: string) {
  let staffNn = pracownicyCache.get(pracownik);
  const name = tt(pracownik).replaceAll(/\s*-\s*/g, "-");
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
  // Remote:
  "konsultacja osobista": "konsultacja osobista", // 13392
  "konsultacja zdalna": "konsultacja zdalna", // 8666

  // Status:
  "odbyte": "odbyte", // 19664
  "odwołane przez klienta": "odwołane przez klienta", // 2599
  "odwołane przez pracownika": "odwołane przez pracownika", // 1518
  "klient nie przyszedł": "klient nie przyszedł", // 1414
  "klient się spóźnił": "klient się spóźnił", // 132
  "nie odbiera": "nie odbiera", // 88

  // Notes:
  "potwierdzone": "potwierdzone", // 1550
  "sms": "sms", // 1481
  "WYSŁANY SMS": "WYSŁANY SMS", // 113
  "INFO": "INFO", // 256
  "koronawirus": "koronawirus", // 195
  "TEAMS": "TEAMS", // 146
  "USPRAWIEDLIWIENIE": "USPRAWIEDLIWIENIE", // 21
  "REZERWACJA": "REZERWACJA", // 17
  "DO POTWIERDZENIA PRZEZ KLIENTA": "DO POTWIERDZENIA PRZEZ KLIENTA", // 13
  "ODWOŁAĆ": "ODWOŁAĆ", // 10
  "PRZEŁOŻYĆ": "PRZEŁOŻYĆ", // 8
};

const ETYKIETY_TO_NOTES = [
  ETYKIETY.potwierdzone,
  ETYKIETY.sms,
  ETYKIETY["WYSŁANY SMS"],
  ETYKIETY.INFO,
  ETYKIETY.koronawirus,
  ETYKIETY.TEAMS,
  ETYKIETY["USPRAWIEDLIWIENIE"],
  ETYKIETY["REZERWACJA"],
  ETYKIETY["DO POTWIERDZENIA PRZEZ KLIENTA"],
  ETYKIETY["ODWOŁAĆ"],
  ETYKIETY["PRZEŁOŻYĆ"],
];

const meetingTypes = MEETING_TYPES.flatMap((c) => c.types.map((t) => t.name));
function meetingTypeNn(typeName: string) {
  typeName = typeName.trim();
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
  ["Terapia indywidualna DOROSŁY", ["Terapia indywidualna"]],
  ["Terapia indywidualna DZIECKO", ["Terapia indywidualna"]],
  ["Konsultacja psychologiczna DOROSŁY", ["Konsultacja psychologiczna"]],
  ["Konsultacja psychologiczna DZIECKO", ["Konsultacja psychologiczna"]],
  ["Konsultacja pierwszorazowa DOROSŁY", ["Konsultacja pierwszorazowa"]],
  ["Konsultacja pierwszorazowa DZIECKO", ["Konsultacja pierwszorazowa"]],
  ["Konsultacja psychiatryczna DOROSŁY", ["Konsultacja psychiatryczna"]],
  ["konsultacja psychiatryczna DOROSŁY", ["Konsultacja psychiatryczna"]],
  ["Konsultacja psychiatryczna DZIECKO", ["Konsultacja psychiatryczna"]],
  ["Przygotowanie do przesłuchania DOROSŁY", ["Przygotowanie do przesłuchania"]],
  ["Przygotowanie do przesłuchania DZIECKO", ["Przygotowanie do przesłuchania"]],
  ["Przygotowanie do przesłuchania  DOROSŁY", ["Przygotowanie do przesłuchania"]],
  ["Przygotowanie do przesłuchania  DZIECKO", ["Przygotowanie do przesłuchania"]],
  ["DYŻUR TELEFONICZNY 800 100 100", ["Dyżur telefoniczny 800\u2009100\u2009100"]],
  ["Blokada terminu", ["Czynności służbowe", true]],
  ["KOREPETYCJE", ["Korepetycje"]],
  ["ZPT", ["Czynności służbowe", true]],
  ["STAŻ", ["Czynności służbowe", true]],
  ["webinarium WSPD", ["Czynności służbowe", true]],
  ["Klub biegłego", ["Czynności służbowe", true]],
  ["konsultacja lekarska", ["Konsultacja lekarska"]],
  ["zebranie kliniczne", ["Zebranie kliniczne"]],
  ["Grupa dla Rodzin Zastępczych", ["Spotkanie grupy", true]],
  ["Grupa dla matek", ["Spotkanie grupy", true]],
  ["Grupa Taneczna", ["Spotkanie grupy", true]],
  ["Grupa Cudzoziemców", ["Spotkanie grupy", true]],
  ["grupa rozwojowa", ["Spotkanie grupy", true]],
  ["Grupa socjoterapeutyczna", ["Spotkanie grupy", true]],
  ["konsultacja socjalna", ["Konsultacja socjalna"]],
  ["konsultacja rodzica z dzieckiem", ["Konsultacja rodzinna"]],
  ["Spotkanie diagnostyczne", ["Konsultacja kwalifikująca", true]],
  ["Konsultacja wsparciowa (przed przesłuchaniem) DOROSŁY", ["Konsultacja wsparciowa (przed przesłuchaniem)"]],
  ["Konsultacja wsparciowa (przed przesłuchaniem) DZIECKO", ["Konsultacja wsparciowa (przed przesłuchaniem)"]],
  ["konsultacja pierwszorazowa", ["Konsultacja pierwszorazowa"]],
]);

const unknownMeetingTypes = new Map<string, number>();
for (const termin of TERMINY.rows) {
  const usługa = termin.usługa?.trim();
  if (usługa && !meetingTypes.includes(usługa) && !meetingTypeMapping.has(usługa)) {
    unknownMeetingTypes.set(usługa, (unknownMeetingTypes.get(usługa) || 0) + 1);
  }
}
if (unknownMeetingTypes.size) {
  console.log("Nieznane typy:");
  for (const [type, count] of [...unknownMeetingTypes].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${JSON.stringify(type)}\t(${count})`);
  }
  Deno.exit();
}

function getStaff2(pracownik: string) {
  return pracownik === "Sekretariat CPD" || pracownik === "Programista Memo" ? undefined : getStaff(pracownik);
}

for (let i = 0; i < TERMINY.rows.length; i++) {
  const termin = TERMINY.rows[i];
  const prevTermin = i ? TERMINY.rows[i - 1] : undefined;
  const isSeries =
    termin["data dodania"] === prevTermin?.["data dodania"] &&
    termin["dodana przez"] === prevTermin["dodana przez"] &&
    termin["pracownik"] === prevTermin["pracownik"] &&
    termin["ID klienta"] === prevTermin["ID klienta"];
  const etykiety = new Set(
    termin.etykiety
      .split(", ")
      .map((e) => e.trim())
      .filter(Boolean),
  );
  const [meetingTypeNnOrName, notesPrefix = undefined] = termin.usługa ? meetingTypeNn(termin.usługa) : ["other"];
  const staffNn = (() => {
    if (!termin.pracownik) {
      return undefined;
    }
    if (termin.pracownik === "Sekretariat CPD") {
      if (meetingTypeNnOrName === "meetingType:Konsultacja lekarska") {
        return getStaff("Anna Pietruszka-Chmarra");
      } else if (meetingTypeNnOrName === "meetingType:Przygotowanie do przesłuchania") {
        return getStaff("Marika Śmigielska");
      } else {
        return "---";
      }
    }
    return getStaff(termin.pracownik);
  })();
  if (staffNn === "---") {
    continue;
  }

  let start = parseDateTime(termin.początek);
  const meeting = {
    nn: termin["ID relacji usługa/wizyta"],
    typeDictNnOrName: meetingTypeNnOrName,
    isRemote: etykiety.has(ETYKIETY["konsultacja zdalna"]),
    notes: [
      notesPrefix?.trim(),
      [...etykiety]
        .filter((e) => ETYKIETY_TO_NOTES.includes(e))
        .map((e) => `#${e}`)
        .join(" "),
      tt(termin["dodatkowy opis"]),
    ]
      .filter(Boolean)
      .join("\n"),
    date: start.toISODate(),
    startDayMinute: start.hour * 60 + start.minute,
    durationMinutes: Number(termin["czas trwania"]),
    status:
      termin.status === "Sfinalizowana" || etykiety.has(ETYKIETY.odbyte)
        ? "completed"
        : termin.status === "Odwołana" ||
            etykiety.has(ETYKIETY["odwołane przez klienta"]) ||
            etykiety.has(ETYKIETY["odwołane przez pracownika"]) ||
            etykiety.has(ETYKIETY["klient nie przyszedł"]) ||
            etykiety.has(ETYKIETY["nie odbiera"])
          ? "cancelled"
          : "planned",
    staff: staffNn
      ? [{userNn: staffNn, attendanceStatus: etykiety.has(ETYKIETY["odwołane przez pracownika"]) ? "cancelled" : "ok"}]
      : [],
    clients: termin["ID klienta"]
      ? [
          {
            userNn: termin["ID klienta"],
            attendanceStatus: etykiety.has(ETYKIETY["odwołane przez klienta"])
              ? "cancelled"
              : etykiety.has(ETYKIETY["klient nie przyszedł"]) ||
                  (etykiety.has(ETYKIETY["nie odbiera"]) && !etykiety.has(ETYKIETY["odbyte"]))
                ? "no_show"
                : etykiety.has(ETYKIETY["klient się spóźnił"])
                  ? etykiety.has(ETYKIETY.odbyte)
                    ? "late_present"
                    : "too_late"
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
    resourceNns:
      !staffNn || termin["powiązane zasoby"] === "Pokój przesłuchań"
        ? [`meetingResource:${POKOJE.find((p) => p.toLocaleLowerCase().includes("przesłuchań"))}`]
        : undefined,
    createdAt: parseDateTime(termin["data dodania"], {zone: "UTC"}),
    createdByNn: getStaff2(termin["dodana przez"]),
    updatedAt: parseDateTime(termin["data ostatniej modyfikacji"], {zone: "UTC"}),
    updatedByNn: getStaff2(termin["autor ostatniej modyfikacji"]),
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

const outContent = JSON.stringify(facilityContents, undefined, 2);
for (const outPath of outPaths) {
  console.log(`Writing result to ${outPath}`);
  Deno.writeTextFileSync(outPath, outContent);
}
console.log("Done");
