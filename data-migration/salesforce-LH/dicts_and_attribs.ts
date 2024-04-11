import {DictionaryOrAttributeAction} from "../facility_contents_type.ts";
import {SURVEY_FIELDS} from "./surveys.ts";

export const dictionariesAndAttributes: DictionaryOrAttributeAction[] = [];

export const LH_MEETING_TYPES = [
  {
    category: "Konsultacje psychologiczne",
    types: [
      {name: "Konsultacja do grupy", duration: 60},
      {name: "Konsultacja pierwszorazowa indywidualna", duration: 60},
      {name: "Konsultacja pierwszorazowa rodzinna", duration: 60},
      {name: "Konsultacja pierwszorazowa pary", duration: 60},
      {name: "Konsultacja indywidualna", duration: 60},
      {name: "Konsultacja z parą", duration: 60},
      {name: "Konsultacja rodzinna", duration: 60},
      {name: "Konsultacja wsparciowa", duration: 60},
      {name: "Terapia indywidualna", duration: 60},
      {name: "Terapia pary", duration: 60},
      {name: "Terapia rodzinna", duration: 60},
      {name: "Konsultacja z profesjonalistą", duration: 60},
      {name: "Konsultacja pierwszorazowa psychiatryczna", duration: 60},
      {name: "Konsultacja psychiatryczna", duration: 30},
    ],
  },
  {
    category: "Wewnętrzne",
    types: [
      {name: "Konferencja", duration: 480},
      {name: "Superwizja zespołu z Gerrym Byrnem", duration: 120},
      {name: "Superwizja FDDS z Gerrym Byrnem", duration: 90},
      {name: "Superwizja z Krystyną Mierzejewską-Orzechowską", duration: 150},
      {name: "Spotkanie Poradni", duration: 0},
      {name: "Spotkanie Poradni online", duration: 0},
      {name: "Superwizja I kontaktu", duration: 90},
      {name: "Webinar", duration: 0},
      {name: "Szkolenie", duration: 0},
      {name: "Podcast", duration: 0},
      {name: "Debata", duration: 0},
    ],
  },
  {
    category: "Profesjonaliści",
    types: [
      {name: "Spotkanie monitorujące", duration: 120},
      {name: "Spotkanie sieciujące", duration: 90},
      {name: "Szkolenie dla profesjonalistów", duration: 0},
    ],
  },
  {
    category: "Grupy",
    types: [
      {name: "Grupa LH dla ojców", duration: 0},
      {name: "Grupa LH dla rodziców", duration: 0},
      {name: "Grupa LH Multifamily", duration: 0},
      {name: "Grupa „Oswoić Depresję”", duration: 0},
      {name: "Grupa wsparcia dla mam", duration: 0},
      {name: "Grupa wsparcia dla ojców", duration: 0},
      {name: "Grupa „Potrafię się zatrzymać”", duration: 0},
      {name: "Grupa psychoedukacyjna", duration: 0},
      {name: "Spotkania edukacyjne", duration: 0},
    ],
  },
  {
    category: "other",
    types: [
      {name: "Wyjazd służbowy", duration: 0},
      {name: "Media (wywiad/nagranie)", duration: 0},
    ],
  },
];

dictionariesAndAttributes.push(
  {
    kind: "extendDictionary",
    name: "meetingCategory",
    positions: LH_MEETING_TYPES.flatMap(({category}) =>
      category === "other"
        ? []
        : {
            nn: `meetingCategory:${category}`,
            name: `+${category}`,
            order: "atEnd",
          },
    ),
  },
  {
    kind: "extendDictionary",
    name: "meetingType",
    positions: LH_MEETING_TYPES.flatMap(({category, types}) =>
      types.map(({name, duration}) => ({
        nn: `meetingType:${name}`,
        name: `+${name}`,
        order: "atEnd",
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
        order: "atEnd",
      },
    ],
  },
);

const POWODY_ZGŁOSZENIA = [
  {
    group: "Trudności wychowawcze",
    items: [
      "trudność w rozpoznawaniu potrzeb dziecka",
      "zaburzona więź z dzieckiem",
      "zaburzona więź separacyjna",
      "trudność w radzeniu sobie z emocjami dziecka",
      "trudności w stawianiu granic",
      "brak konsekwencji w postępowaniu z dzieckiem",
      "kłopoty w komunikacji z dzieckiem",
      "zbyt wysokie oczekiwania wobec dziecka",
      "problem z radzeniem sobie z własnymi emocjami",
      "niepokojące zachowania dziecka",
      "niepokój zw. z nieprawidłowym rozwojem",
    ],
  },
  {
    group: "Kryzys w rodzinie",
    items: [
      "separacja",
      "rozwód",
      "samotne rodzicielstwo",
      "rodzina rekonstruowana",
      "wczesne rodzicielstwo",
      "nieplanowana ciąża",
      "śmierć w rodzinie",
      "przewlekła lub nagła choroba",
      "depresja",
    ],
  },
  {
    group: "Zaniedbywanie",
    items: [
      "chłód emocjonalny",
      "brak reakcji na płacz dziecka",
      "pozostawienie bez opieki",
      "brak zainteresowania dzieckiem",
    ],
  },
];

export const DZIELNICE_WARSZAWY = [
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
  "spoza Warszawy",
];

dictionariesAndAttributes.push(
  {
    kind: "createDictionary",
    nn: "dict:źródło informacji o Poradni",
    name: "+źródło informacji o Poradni",
    positions: [
      "sąd",
      "OPS",
      "ZOZ",
      "żłobek",
      "przedszkole",
      "szkoła",
      "internet",
      "media",
      "sam/sama",
      "znajomi",
      "inna instytucja",
      "inne",
    ].map((n) => ({nn: `źródło informacji:${n}`, name: `+${n}`})),
  },
  {
    kind: "createDictionary",
    nn: "dict:dzielnica Warszawy",
    name: "+dzielnica Warszawy",
    positions: DZIELNICE_WARSZAWY.map((n) => ({nn: `dzielnica:${n}`, name: `+${n}`})),
  },
  {
    kind: "createDictionary",
    nn: "dict:powód zgłoszenia",
    name: "+powód zgłoszenia",
    positions: POWODY_ZGŁOSZENIA.flatMap(({items}) =>
      items.map((n) => ({
        nn: `powód zgłoszenia:${n}`,
        name: `+${n}`,
      })),
    ),
  },
  {
    kind: "createDictionary",
    nn: "dict:czynnik ryzyka",
    name: "+czynnik ryzyka",
    positions: SURVEY_FIELDS.flatMap(({items}) =>
      items.map(({label}) => ({
        nn: `czynnik ryzyka:${label}`,
        name: `+${label}`,
      })),
    ),
  },
);

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

dictionariesAndAttributes.push(
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
    name: "+dzielnica Warszawy",
    apiName: "dzielnicaWarszawyU$",
    order: {rel: "after", attributeApiName: "addressCity"},
    model: "client",
    isMultiValue: false,
    type: "dict",
    dictionaryNnOrName: "dict:dzielnica Warszawy",
    requirementLevel: "recommended",
  },
  {
    kind: "createAttribute",
    name: "+województwo",
    apiName: "wojewodztwoU$",
    order: {rel: "after", attributeApiName: "dzielnicaWarszawyU$"},
    model: "client",
    isMultiValue: false,
    type: "dict",
    dictionaryNnOrName: "pl_voivodeship",
    requirementLevel: "recommended",
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
    name: "+czynniki ryzyka",
    apiName: "czynnikiRyzykaU$",
    order: {rel: "after", attributeApiName: "powodZgloszeniaU$"},
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:czynnik ryzyka",
    requirementLevel: "recommended",
  },
  {
    kind: "createAttribute",
    name: "+decyzja zespołu klinicznego",
    apiName: "decyzjaZespoluKlinicznegoU$",
    order: {rel: "before", attributeApiName: "czynnikiRyzykaU$"},
    model: "client",
    isMultiValue: false,
    type: "text",
    requirementLevel: "optional",
  },
  {
    kind: "createAttribute",
    name: "+rodzina (konto salesforce)",
    apiName: "rodzinaKontoSalesforceU$",
    order: {rel: "before", attributeApiName: "documentsLinks"},
    model: "client",
    isMultiValue: false,
    type: "text",
    requirementLevel: "optional",
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
    name: "+źródło informacji o Poradni",
    apiName: "zrodloInfOPoradniU$",
    order: "atEnd",
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:źródło informacji o Poradni",
    requirementLevel: "optional",
  },
);
