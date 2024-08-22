import * as fs from "https://deno.land/std@0.190.0/fs/mod.ts";
import {parseArgs} from "https://deno.land/std@0.220.1/cli/parse_args.ts";
import * as csv from "https://deno.land/std@0.220.1/csv/mod.ts";
import {DateTimeOptions} from "https://esm.sh/luxon@latest";
import {
  Client,
  CreateDictionaryAction,
  FacilityContents,
  facilityContentStats,
  Meeting,
  NnAttributeValue,
  Staff,
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
  klienci: FieldsType<["ID","imię","nazwisko","email","numer PESEL","numer karty","Saldo klienta","telefon komórkowy","telefon stacjonarny","płeć","adres","kod pocztowy","miasto","data urodzenia","data imienin (dzień i miesiąc)","opis","sformatowany opis","pochodzenie klienta (źródło)","status pochodzenia klienta","przypomnienie SMS","przypomnienie email","wysyłka masowa SMS","wysyłka masowa email","Marketing Automatyczny SMS","Marketing Automatyczny email","życzenia urodzinowe/imieninowe SMS","życzenia urodzinowe/imieninowe email","Program Lojalnościowy SMS","Program Lojalnościowy email","opinie SMS","opinie email","dodany dnia","zgoda handlowa","status programu lojalnościowego","punkty programu lojalnościowego","Maksymalna liczba rezerwacji online","zdefiniowane: relacje","zdefiniowane: dorosły/dziecko","zdefiniowane: wiek w momencie zgłoszenia","zdefiniowane: powód zgłoszenia","zdefiniowane: sprawca","zdefiniowane: płeć sprawcy","zdefiniowane: data zgłoszenia","zdefiniowane: data pierwszej konsultacji","zdefiniowane: Notatka o kliencie","zdefiniowane: Projekt","zdefiniowane: Status klienta","zdefiniowane: Skład grupy roboczej","zdefiniowane: Koordynator przypadku"]>,
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

let KLIENCI = readCSV<FilesType["klienci"]>(`${exportsDir}/klienci_148679.csv`, "ID");
let TERMINY = readCSV<FilesType["terminy"]>(`${exportsDir}/terminy_148679.csv`, "ID wizyty");

console.log(`Reading static data from ${staticDataDir}`);

const STAFF = readCSV<"name" | "email">(`${staticDataDir}/staff.csv`, "email");

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
TERMINY = rejectAndLog(TERMINY, (t) => t.pracownik === "Aurelia Jankowska", "Spotkania Aurelii Jankowskiej");
TERMINY = rejectAndLog(TERMINY, (t) => t.usługa === "Blokada terminu", `Spotkania "Blokada terminu"`);
console.log(`Liczba prawidłowych spotkań: ${TERMINY.rows.length}`);

function tt(text: string) {
  return (
    text
      .replaceAll(/<([a-z]*\b)[\s\S]*?(?:>([\s\S]+?)<\/\1>|\/>)/g, (_mat, tag, content = "") =>
        tag === "br" ? "\n" : tag === "p" ? content + "\n" : content,
      )
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

const staff: Staff[] = STAFF.rows.map(({name, email}) => ({
  nn: name,
  name: name,
  email: email || null,
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

function dateTimeIn(s: string, opts?: DateTimeOptions) {
  return dateTimeFromFormats(s, ["yyyy-MM-dd H:mm:ss ZZZ", "yyyy-MM-dd H:mm"], opts);
}

function dateDDMMYYYYIn(s: string) {
  return dateTimeFromFormats(s.trim(), ["d.MM.yyyy", "d.MM.yyyy.", "d.MM.yy", "d.MM.yy.", "yyyy-MM-dd"]);
}

function dateTimeOut(d: DateTime) {
  return d.toUTC().set({millisecond: 0}).toISO({suppressMilliseconds: true});
}

function dateTimeInOut(s: string, opts?: DateTimeOptions) {
  return dateTimeOut(dateTimeIn(s, opts));
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
console.log(`Usunięci klienci: ${deletedClients.size}`);

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

const projektGetter = customDictGetter("projekt");
for (const klient of KLIENCI.rows) {
  const terminy = TERMINY.rows
    .filter((t) => t["ID klienta"] === klient.ID)
    .sort((a, b) => dateTimeIn(a.początek).toMillis() - dateTimeIn(b.początek).toMillis());
  const statusKlientaGetter = customDictGetter("status klienta");
  const powódZgłoszeniaGetter = customDictGetter("powód zgłoszenia");
  const sprawcaGetter = customDictGetter("sprawca", {
    "osoba z poza rodziny znana dziecku": "osoba spoza rodziny znana dziecku",
    "osoba z poza rodzina nieznana dziecku": "osoba spoza rodziny nieznana dziecku",
  });
  let projekt;
  if (klient["zdefiniowane: Projekt"]) {
    projekt = projektGetter.req(klient["zdefiniowane: Projekt"]);
  } else if (klient.email) {
    const mailPart = klient.email.split("@")[0].split(".")[1];
    if (mailPart === "rodzina") {
      projekt = projektGetter.req("CWR");
    } else {
      const matchingProjekt = projektGetter.values.find(
        (v) => v.split(" ")[0].toLowerCase() === mailPart.toLowerCase(),
      );
      if (matchingProjekt) {
        projekt = projektGetter.req(matchingProjekt);
      } else {
        throw new Error(`Unknown project from email: ${JSON.stringify(klient.email)}`);
      }
    }
  }
  let type;
  if (klient["zdefiniowane: dorosły/dziecko"] === "dziecko") {
    type = "child";
  } else if (klient["zdefiniowane: dorosły/dziecko"] === "dorosły") {
    type = "adult";
  } else if (klient["data urodzenia"]) {
    const birth = DateTime.fromISO(klient["data urodzenia"]);
    const ref = klient["zdefiniowane: data zgłoszenia"]
      ? dateDDMMYYYYIn(klient["zdefiniowane: data zgłoszenia"])
      : DateTime.fromISO("2024-01-01");
    const age = ref.diff(birth, "years").years;
    type = age < 18 ? "child" : "adult";
  } else {
    type = "adult";
  }
  clients.push({
    nn: klient.ID,
    name: tt(`${klient.imię} ${klient.nazwisko}`),
    createdAt: dateTimeInOut(klient["dodany dnia"]),
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
      wiekWMomencieZgloszeniaU$: klient["zdefiniowane: wiek w momencie zgłoszenia"]
        ? {kind: "const", value: parseInt(klient["zdefiniowane: wiek w momencie zgłoszenia"])}
        : undefined,
      contactPhone: {kind: "const", value: klient["telefon komórkowy"]},
      addressStreetNumber: {kind: "const", value: tt(klient.adres)},
      addressPostalCode: {kind: "const", value: tt(klient["kod pocztowy"])},
      addressCity: {kind: "const", value: tt(klient.miasto)},
      statusKlientaU$: statusKlientaGetter.opt(klient["zdefiniowane: Status klienta"]),
      contactStartAt: klient["zdefiniowane: data zgłoszenia"]
        ? {
            kind: "const",
            value: dateDDMMYYYYIn(klient["zdefiniowane: data zgłoszenia"]).toISODate(),
          }
        : undefined,
      contactEndAt:
        klient["zdefiniowane: Status klienta"] === "kontakt zakończony"
          ? {
              kind: "const",
              value: (terminy.length
                ? dateTimeIn(terminy.at(-1)!.początek)
                : klient["zdefiniowane: data zgłoszenia"]
                  ? dateDDMMYYYYIn(klient["zdefiniowane: data zgłoszenia"])
                  : undefined
              )?.toISODate(),
            }
          : undefined,
      powodZgloszeniaU$: klient["zdefiniowane: powód zgłoszenia"]
        .split(", ")
        .filter(Boolean)
        .map(powódZgłoszeniaGetter.req),
      sprawcaU$: klient["zdefiniowane: sprawca"].split(", ").filter(Boolean).map(sprawcaGetter.req),
      plecSprawcyU$: klient["zdefiniowane: płeć sprawcy"]
        .split(", ")
        .filter(Boolean)
        .map((p) => ({
          kind: "dict",
          dictName: "gender",
          positionName: p === "kobieta" ? "female" : p === "mężczyzna" ? "male" : "unknown",
        })),
      projektU$: projekt,
      shortCode: {kind: "const", value: klient["numer karty"]},
      relacjeU$: tt(klient["zdefiniowane: relacje"])
        .split("\n")
        .filter(Boolean)
        .map((r) => ({kind: "const", value: r})),
      notes: {
        kind: "const",
        value: [tt(klient["zdefiniowane: Notatka o kliencie"]), tt(klient["zdefiniowane: Skład grupy roboczej"])]
          .filter(Boolean)
          .join("\n"),
      },
    },
  });
}

function intervalBetween(d1: string, d2: string) {
  const numDays = dateTimeIn(d2).diff(dateTimeIn(d1), "days").days;
  return [1, 7, 14].includes(numDays) ? `${numDays}d` : undefined;
}

const pracownicyCache = new Map<string, string>();
function getStaff(pracownik: string) {
  let staffNn = pracownicyCache.get(pracownik);
  const name = tt(pracownik);
  if (!staffNn) {
    const staff = STAFF.rows.find((staff) => staff.name === name);
    if (!staff) {
      throw new Error(`Staff ${JSON.stringify(name)} not found`);
    }
    staffNn = staff.name;
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
  if (!meetingTypes.includes(mappedTypeName)) {
    throw new Error(`Meeting type ${JSON.stringify(typeName)} not found`);
  }
  return [`meetingType:${mappedTypeName}`, retainUsługa ? typeName : undefined] as const;
}

const meetingTypeMapping = new Map<string, [type: string, retain?: boolean]>([
  ["Konsultacja psychologiczna dorosły", ["Konsultacja psychologiczna"]],
  ["Terapia indywidualna dziecko", ["Terapia indywidualna"]],
  ["Konsultacja psychologiczna dziecko", ["Konsultacja psychologiczna"]],
  ["Terapia indywidualna dorosły", ["Terapia indywidualna"]],
  ["Konsultacja prawna ", ["Konsultacja prawna"]],
  ["Konsultacja pierwszorazowa - dorosły", ["Konsultacja pierwszorazowa"]],
  ["konsultacja rodzicielska", ["Konsultacja rodzinna"]],
  ["Przesłuchanie", ["Czynności służbowe", true]],
  ["Konsultacja pierwszorazowa - dziecko", ["Konsultacja pierwszorazowa"]],
  ["Zebranie kliniczne", ["Zespół kliniczny"]],
  ["konsultacja dla klientów z Ukrainy ", ["Konsultacja psychologiczna", true]],
  ["konsultacja z rodzicem", ["Konsultacja psychologiczna", true]],
  ["konsultacja dla par", ["Konsultacja rodzinna"]],
  ["konsultacja kwalifikacyjna", ["Konsultacja kwalifikacyjna"]],
  ["Grupa dla nastolatków", ["Grupa dla dzieci i młodzieży"]],
  ["Dyżur prawny telefoniczny 800100100", ["Czynności służbowe", true]],
  ["Superwizja sekretariatu", ["Czynności służbowe", true]],
  ["Konsultascja psychologiczno - pedagogiczna", ["Konsultacja psychologiczna"]],
  ["konsultacja prawna z profesjonalistą", ["Konsultacja prawna", true]],
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
  let start = dateTimeIn(termin.początek);
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
    createdAt: dateTimeInOut(termin["data dodania"], {zone: "UTC"}),
    createdByNn: getStaff(termin["dodana przez"]),
    updatedAt: dateTimeInOut(termin["data ostatniej modyfikacji"], {zone: "UTC"}),
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
  staff,
  clients,
  meetings,
};

console.log("Prepared data:");
console.log(facilityContentStats(facilityContents));

console.log(`Writing result to ${outPath}`);
Deno.writeTextFileSync(outPath, JSON.stringify(facilityContents, undefined, 2));
console.log("Done");
