import {DictionaryOrAttributeAction} from "../facility_contents_type.ts";

export const dictionariesAndAttributes: DictionaryOrAttributeAction[] = [];

export const MEETING_TYPES = [
  {
    category: "Konsultacje psychologiczne",
    types: [
      {name: "Konsultacja pierwszorazowa", duration: 60},
      {name: "Konsultacja psychologiczna", duration: 60},
      {name: "Konsultacja rodzinna", duration: 90},
      {name: "Przygotowanie do przesłuchania", duration: 60},
      {name: "Terapia indywidualna", duration: 60},
      {name: "Terapia rodzinna", duration: 90},
      {name: "Konsultacja kwalifikacyjna", duration: 60},
    ],
  },
  {
    category: "Wewnętrzne",
    types: [
      {name: "Czynności służbowe", duration: 0},
      {name: "Superwizja", duration: 180},
      {name: "Zespół kliniczny", duration: 240},
    ],
  },
  {
    category: "Profesjonaliści",
    types: [{name: "Konsultacja z profesjonalistą", duration: 60}],
  },
  {
    category: "Grupy",
    types: [
      {name: "Grupa dla dzieci i młodzieży", duration: 90},
      {name: "Grupa psychoedukacyjna dla rodziców/opiekunów", duration: 90},
      {name: "Grupa rozwojowa dla dzieci", duration: 90},
      {name: "Grupa rozwojowa dla młodzieży", duration: 90},
      {name: "Lighthouse", duration: 120},
    ],
  },
  {
    category: "other",
    types: [
      {name: "Konsultacja prawna", duration: 60},
      {name: "Badanie po przesłuchaniu", duration: 60},
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
  "cyberprzemoc",
  "niebezpieczne kontakty w sieci",
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
    kind: "createDictionary",
    nn: "dict:status klienta",
    name: "+status klienta",
    positions: ["lista oczekujących", "w kontakcie", "kontakt przerwany", "kontakt zakończony", "przekierowany"].map(
      (n) => ({nn: `status klienta:${n}`, name: `+${n}`}),
    ),
  },
  {
    kind: "createAttribute",
    name: "+status klienta",
    apiName: "statusKlientaU$",
    order: {rel: "before", attributeApiName: "contactStartAt"},
    model: "client",
    isMultiValue: false,
    type: "dict",
    dictionaryNnOrName: "dict:status klienta",
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
    kind: "createDictionary",
    nn: "dict:projekt",
    name: "+projekt",
    positions: [
      "SCWR",
      "Starogard",
      "Powiat Starogardzki",
      "Zblewo",
      "Tczew",
      "Skarszewy",
      "FDDS",
      "Rewitalizacja",
      "CWR",
      "Ukraina",
    ].map((n) => ({nn: `projekt:${n}`, name: `+${n}`})),
  },
  {
    kind: "createAttribute",
    name: "+projekt",
    apiName: "projektU$",
    order: {rel: "after", attributeApiName: "plecSprawcyU$"},
    model: "client",
    isMultiValue: false,
    type: "dict",
    dictionaryNnOrName: "dict:projekt",
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
    requirementLevel: "optional",
  },
);
