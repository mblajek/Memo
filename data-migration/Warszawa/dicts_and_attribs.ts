import {DictionaryOrAttributeAction} from "../facility_contents_type.ts";

export const dictionariesAndAttributes: DictionaryOrAttributeAction[] = [];

export const MEETING_TYPES = [
  {
    category: "Konsultacje psychologiczne",
    types: [
      {name: "Badanie sądowo-psychologiczne", duration: 120},
      {name: "Konsultacja Lighthouse", duration: 60},
      {name: "Konsultacja do grupy", duration: 60},
      {name: "Konsultacja kwalifikująca", duration: 60},
      {name: "Konsultacja pierwszorazowa", duration: 90},
      {name: "Konsultacja psychologiczna", duration: 60},
      {name: "Konsultacja rodzinna", duration: 60},
      {name: "Konsultacja wsparciowa (przed przesłuchaniem)", duration: 60},
      {name: "Konsultacja z parą", duration: 60},
      {name: "Konsultacja z rodzicem", duration: 60},
      {name: "Przygotowanie do przesłuchania", duration: 30},
      {name: "Terapia indywidualna", duration: 60},
    ],
  },
  {
    category: "Wewnętrzne",
    types: [
      {name: "Czynności służbowe", duration: 60},
      {name: "Konferencja", duration: 420},
      {name: "Przesłuchanie pracownika", duration: 120},
      {name: "Spotkanie ewaluacyjne", duration: 60},
      {name: "Spotkanie służbowe", duration: 120},
      {name: "Zebranie interdyscyplinarne", duration: 150},
      {name: "Zebranie kliniczne", duration: 270},
      {name: "Superwizja zespołu", duration: 180},
      {name: "Szkolenie", duration: 0},
    ],
  },
  {
    category: "Profesjonaliści",
    types: [
      {name: "Konsultacja z profesjonalistą", duration: 60},
      {name: "Spotkanie interdyscyplinarne", duration: 60},
      {name: "Superwizja WSPD", duration: 150},
      {name: "Superwizja z profesjonalistą", duration: 60},
      {name: "Zespół Interdyscyplinarny", duration: 480},
    ],
  },
  {
    category: "Grupy",
    types: [
      {name: "Akademia Medyczna", duration: 180},
      {name: "Grupa Lighthouse", duration: 120},
      {name: "Spotkanie grupy", duration: 60},
      {name: "Grupa robocza", duration: 60},
    ],
  },
  {
    category: "other",
    types: [
      {name: "Konsultacja prawna", duration: 60},
      {name: "Konsultacja psychiatryczna", duration: 60},
      {name: "Media (wywiad/nagranie)", duration: 60},
      {name: "Przesłuchanie", duration: 60},
      {name: "Konsultacja lekarska", duration: 60},
      {name: "Konsultacja socjalna", duration: 60},
      {name: "Korepetycje", duration: 60},
      {name: "Dyżur telefoniczny 800\u2009100\u2009100", duration: 60},
    ],
  },
];

dictionariesAndAttributes.push(
  {
    kind: "extendDictionary",
    name: "meetingCategory",
    positions: MEETING_TYPES.flatMap(({category}) =>
      category === "other"
        ? []
        : {
            nn: `meetingCategory:${category}`,
            name: `+${category}`,
          },
    ),
  },
  {
    kind: "extendDictionary",
    name: "meetingType",
    positions: MEETING_TYPES.flatMap(({category, types}) =>
      types.map(({name, duration}) => ({
        nn: `meetingType:${name}`,
        name: `+${name}`,
        attributes: {
          categoryDictId:
            category === "other"
              ? {kind: "dict", dictName: "meetingCategory", positionName: "other"}
              : {kind: "nn", nn: `meetingCategory:${category}`},
          durationMinutes: {kind: "const", value: duration},
        },
      })),
    ),
  },
  {
    kind: "extendDictionary",
    name: "clientType",
    positions: [
      {
        nn: "clientType:profesjonalista",
        name: "+profesjonalista",
      },
    ],
  },
);

const POWODY_ZGŁOSZENIA = [
  "przemoc fizyczna",
  "przemoc psychiczna",
  "wykorzystanie seksualne",
  "zaniedbanie",
  "świadek przestępstwa",
  "przygotowanie do przesłuchania",
  "nadużywanie internetu",
  "niebezpieczne kontakty w sieci",
  "szkodliwe treści",
  "cyberprzemoc",
  "inne",
];

dictionariesAndAttributes.push({
  kind: "createDictionary",
  nn: "dict:powód zgłoszenia",
  name: "+powód zgłoszenia",
  positions: POWODY_ZGŁOSZENIA.flatMap((n) => ({
    nn: `powód zgłoszenia:${n}`,
    name: `+${n}`,
  })),
});

const SPRAWCA = ["osoba z rodziny", "osoba spoza rodziny znana dziecku", "osoba spoza rodziny nieznana dziecku"];

dictionariesAndAttributes.push({
  kind: "createDictionary",
  nn: "dict:sprawca",
  name: "+sprawca",
  positions: SPRAWCA.map((n) => ({nn: `sprawca:${n}`, name: `+${n}`})),
});

dictionariesAndAttributes.push({
  kind: "createDictionary",
  nn: "dict:źródło informacji o CPD",
  name: "+źródło informacji o CPD",
  positions: [
    "sąd",
    "OPS",
    "ZOZ",
    "szkoła/przedszkole",
    "Internet",
    "media",
    "sam/sama",
    "znajomi",
    "inna instytucja",
    "inne",
  ].map((n) => ({nn: `źródło informacji:${n}`, name: `+${n}`})),
});

const DZIELNICE_WARSZAWY = [
  "Bemowo",
  "Białołęka",
  "Bielany",
  "Mokotów",
  "Ochota",
  "Praga-Południe",
  "Praga-Północ",
  "Rembertów",
  "Śródmieście",
  "Targówek",
  "Ursus",
  "Ursynów",
  "Wawer",
  "Wesoła",
  "Wilanów",
  "Włochy",
  "Wola",
  "Żoliborz",
];

dictionariesAndAttributes.push({
  kind: "createDictionary",
  nn: "dict:dzielnica Warszawy",
  name: "+dzielnica Warszawy",
  positions: DZIELNICE_WARSZAWY.map((n) => ({nn: `dzielnica Warszawy:${n}`, name: `+${n}`})),
});

dictionariesAndAttributes.push(
  {
    kind: "createAttribute",
    name: "+",
    apiName: "globalSeparatorContactInfoU$",
    order: {rel: "before", attributeApiName: "contactEmail"},
    model: "client",
    isMultiValue: false,
    type: "separator",
    requirementLevel: "empty",
  },
  {
    kind: "createAttribute",
    name: "+",
    apiName: "globalSeparatorOtherU$",
    order: {rel: "before", attributeApiName: "contactStartAt"},
    model: "client",
    isMultiValue: false,
    type: "separator",
    requirementLevel: "empty",
  },
);

const PLACOWKI = ["Centrum Pomocy Dzieciom", "Poradnia Dziecko w Sieci"];

dictionariesAndAttributes.push({
  kind: "createDictionary",
  nn: "dict:placowka",
  name: "+placówka",
  positions: PLACOWKI.map((n) => ({nn: `placowka:${n}`, name: `+${n}`})),
});

const POKOJE = [
  "1 (kosmos)",
  "2 (lekarski)",
  "3 (namiot)",
  "4 (dziecięcy)",
  "5 (rodzinny)",
  "8 (palmy)",
  "10 (pasy)",
  "19 (parter)",
  "pokój przesłuchań ❌tylko do przesłuchań❌",
];

dictionariesAndAttributes.push({
  kind: "extendDictionary",
  name: "meetingResource",
  positions: POKOJE.map((n) => ({nn: `meetingResource:${n}`, name: `+${n}`})),
});

dictionariesAndAttributes.push(
  {
    kind: "createAttribute",
    name: "+placówka",
    apiName: "placowkaU$",
    order: {rel: "before", attributeApiName: "shortCode"},
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:placowka",
    requirementLevel: "required",
  },

  {
    kind: "createAttribute",
    name: "+dzielnica",
    apiName: "dzielnicaWarszawyU$",
    order: {rel: "after", attributeApiName: "addressCity"},
    model: "client",
    isMultiValue: false,
    type: "dict",
    dictionaryNnOrName: "dict:dzielnica Warszawy",
    requirementLevel: "optional",
  },

  {
    kind: "createAttribute",
    name: "+wiek w momencie zgłoszenia",
    apiName: "wiekWMomencieZgloszeniaU$",
    order: {rel: "after", attributeApiName: "birthDate"},
    model: "client",
    isMultiValue: false,
    type: "int",
    requirementLevel: "optional",
  },

  {
    kind: "createAttribute",
    name: "+powód zgłoszenia",
    apiName: "powodZgloszeniaU$",
    order: {rel: "after", attributeApiName: "contactEndAt"},
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:powód zgłoszenia",
    requirementLevel: "recommended",
  },

  {
    kind: "createAttribute",
    name: "+sprawca",
    apiName: "sprawcaU$",
    order: {rel: "after", attributeApiName: "powodZgloszeniaU$"},
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:sprawca",
    requirementLevel: "recommended",
  },

  {
    kind: "createAttribute",
    name: "+płeć sprawcy",
    apiName: "plecSprawcyU$",
    order: {rel: "after", attributeApiName: "sprawcaU$"},
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "gender",
    requirementLevel: "recommended",
  },

  {
    kind: "createAttribute",
    name: "+",
    apiName: "separator1U$",
    order: {rel: "before", attributeApiName: "notificationMethodDictIds"},
    model: "client",
    isMultiValue: false,
    type: "separator",
    requirementLevel: "empty",
  },
  {
    kind: "createAttribute",
    name: "+źródło informacji o CPD",
    apiName: "zrodloInfOPoradniU$",
    order: "atEnd",
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:źródło informacji o CPD",
    requirementLevel: "optional",
  },

  {
    kind: "createAttribute",
    name: "+relacje",
    apiName: "relacjeU$",
    order: "atEnd",
    model: "client",
    isMultiValue: true,
    type: "string",
    requirementLevel: "empty",
  },

  {
    kind: "extendDictionary",
    name: "clientGroupClientRole",
    positions: [
      {name: "+matka"},
      {name: "+ojciec"},
      {name: "+matka zastępcza"},
      {name: "+ojciec zastępczy"},
      {name: "+opiekun"},
    ],
  },
);
