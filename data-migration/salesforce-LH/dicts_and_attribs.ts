import {Attribute, Dictionary, DictionaryExtension} from "../facility_contents_type.ts";
import {SURVEY_FIELDS} from "./surveys.ts";

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
      {name: "konsultacja wsparciowa", duration: 60},
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

export const extendDictionaries: DictionaryExtension[] = [
  {
    name: "meetingCategory",
    positions: LH_MEETING_TYPES.map(({category}) => ({
      nn: `meetingCategory:${category}`,
      name: `+${category}`,
      order: "atEnd",
    })),
  },
  {
    name: "meetingType",
    positions: LH_MEETING_TYPES.flatMap(({category, types}) =>
      types.map(({name, duration}) => ({
        nn: `meetingType:${name}`,
        name: `+${name}`,
        order: "atEnd",
        attributes: {
          categoryDictId: {kind: "nn", nn: `meetingCategory:${category}`},
          durationMinutes: {kind: "const", value: duration},
        },
      })),
    ),
  },
  {
    name: "clientType",
    positions: [
      {
        nn: "clientType:profesjonalista",
        name: "+profesjonalista",
        order: "atEnd",
      },
    ],
  },
];

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

export const dictionaries: Dictionary[] = [
  {
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
    ].map((n) => ({name: `+${n}`})),
  },
  {
    nn: "dict:dzielnica Warszawy",
    name: "+dzielnica Warszawy",
    positions: [
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
    ].map((n) => ({nn: `dzielnica:${n}`, name: `+${n}`})),
  },
  {
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
    nn: "dict:czynnik ryzyka",
    name: "+czynnik ryzyka",
    positions: SURVEY_FIELDS.flatMap(({items}) =>
      items.map(({label}) => ({
        nn: `czynnik ryzyka:${label}`,
        name: `+${label}`,
      })),
    ),
  },
];

export const attributes: Attribute[] = [
  {
    name: "+rodzina (konto salesforce)",
    apiName: "rodzinaKontoSalesforceU4d096794",
    order: {rel: "after", attributeApiName: "documentsLinks"},
    model: "client",
    isMultiValue: false,
    type: "string",
    requirementLevel: "optional",
  },
  {
    name: "+źródło informacji o Poradni",
    apiName: "zrodloInfOPoradniU53e2f750",
    order: "atEnd",
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:źródło informacji o Poradni",
    requirementLevel: "optional",
  },
  {
    name: "+wiek w momencie zgłoszenia",
    apiName: "wiekWMomencieZgloszeniaUfdf0fed0",
    order: {rel: "after", attributeApiName: "birthDate"},
    model: "client",
    isMultiValue: false,
    type: "number",
    requirementLevel: "optional",
  },
  {
    name: "+dzielnica Warszawy",
    apiName: "dzielnicaWarszawyUbb5a0106",
    order: {rel: "after", attributeApiName: "addressCity"},
    model: "client",
    isMultiValue: false,
    type: "dict",
    dictionaryNnOrName: "dict:dzielnica Warszawy",
    requirementLevel: "recommended",
  },
  {
    name: "+województwo",
    apiName: "wojewodztwoUa33962d0",
    order: {rel: "after", attributeApiName: "dzielnicaWarszawyUbb5a0106"},
    model: "client",
    isMultiValue: false,
    type: "dict",
    dictionaryNnOrName: "pl_voivodeship",
    requirementLevel: "recommended",
  },
  {
    name: "+decyzja zespołu klinicznego",
    apiName: "decyzjaZespoluKlinicznegoU577dc53c",
    order: {rel: "after", attributeApiName: "notes"},
    model: "client",
    isMultiValue: false,
    type: "text",
    requirementLevel: "optional",
  },
  {
    name: "+powód zgłoszenia",
    apiName: "powodZgloszeniaU6ee41728",
    order: {rel: "before", attributeApiName: "documentsLinks"},
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:powód zgłoszenia",
    requirementLevel: "recommended",
  },
  {
    name: "+czynniki ryzyka",
    apiName: "czynnikiRyzykaU779e16de",
    order: {rel: "after", attributeApiName: "powodZgloszeniaU6ee41728"},
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:czynnik ryzyka",
    requirementLevel: "recommended",
  },
];
