import {DictionaryOrAttributeAction} from "../facility_contents_type.ts";

export const dictionariesAndAttributes: DictionaryOrAttributeAction[] = [];

export const MEETING_TYPES = [
  {
    category: "Konsultacje psychologiczne",
    types: [
      {name: "Konsultacja kwalifikacyjna", duration: 60},
      {name: "Konsultacja pierwszorazowa", duration: 60},
      {name: "Konsultacja psychologiczna", duration: 60},
      {name: "Konsultacja rodzinna", duration: 90},
      {name: "Konsultacja z rodzicem", duration: 60},
      {name: "Przygotowanie do przesłuchania", duration: 60},
      {name: "Terapia indywidualna", duration: 60},
    ],
  },
  {
    category: "Wewnętrzne",
    types: [
      {name: "Czynności służbowe", duration: 0},
      {name: "Superwizja", duration: 180},
      {name: "Zebranie kliniczne", duration: 240},
      {name: "Wolny termin", duration: 60},
    ],
  },
  {
    category: "Grupy",
    types: [
      {name: "Grupa dla rodziców", duration: 120},
      {name: "Grupa warsztatowa", duration: 120},
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
    name: "meetingResource",
    positions: [
      {nn: "meetingResource:gabinet 1", name: "+gabinet 1"},
      {nn: "meetingResource:gabinet 2", name: "+gabinet 2"},
      {nn: "meetingResource:biblioteka", name: "+biblioteka"},
    ],
  },
);

const POWODY_ZGŁOSZENIA = ["przemoc fizyczna", "przemoc psychiczna", "świadek przestępstwa", "inne"];

dictionariesAndAttributes.push({
  kind: "createDictionary",
  nn: "dict:powód zgłoszenia",
  name: "+powód zgłoszenia",
  positions: POWODY_ZGŁOSZENIA.flatMap((n) => ({
    nn: `powód zgłoszenia:${n}`,
    name: `+${n}`,
  })),
});

dictionariesAndAttributes.push({
  kind: "createDictionary",
  nn: "dict:źródło informacji o placówce",
  name: "+źródło informacji o placówce",
  positions: ["sąd", "OPS", "szkoła/przedszkole", "internet", "media", "inne"].map((n) => ({
    nn: `źródło informacji:${n}`,
    name: `+${n}`,
  })),
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
    name: "+inne pola zdefiniowane przez placówkę",
    apiName: "anyFieldsU$",
    order: "atEnd",
    model: "client",
    isMultiValue: false,
    type: "text",
    requirementLevel: "optional",
  },
  {
    kind: "createAttribute",
    name: "+źródło informacji o placówce",
    apiName: "zrodloInfOPoradniU$",
    order: "atEnd",
    model: "client",
    isMultiValue: true,
    type: "dict",
    dictionaryNnOrName: "dict:źródło informacji o placówce",
    requirementLevel: "optional",
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
