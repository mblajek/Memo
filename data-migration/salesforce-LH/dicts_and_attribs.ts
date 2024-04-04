import {Attribute, Dictionary, DictionaryExtension} from "../facility_contents_type.ts";

export const dictionaries: Dictionary[] = [];

export const extendDictionaries: DictionaryExtension[] = [
  {
    name: "meetingCategory",
    positions: [
      {
        nn: "meetingCategory:Konsultacje psychologiczne",
        name: "+Konsultacje psychologiczne",
        isFixed: false,
        defaultOrder: 10,
        isDisabled: false,
      },
      {
        nn: "meetingCategory:Wewnętrzne",
        name: "+Wewnętrzne",
        isFixed: false,
        defaultOrder: 11,
        isDisabled: false,
      },
      {
        nn: "meetingCategory:Profesjonaliści",
        name: "+Profesjonaliści",
        isFixed: false,
        defaultOrder: 12,
        isDisabled: false,
      },
      {
        nn: "meetingCategory:Grupy",
        name: "+Grupy",
        isFixed: false,
        defaultOrder: 13,
        isDisabled: false,
      },
    ],
  },
  {
    name: "meetingType",
    positions: [
      // Category: Konsultacje psychologiczne
      {
        nn: "meetingType:Konsultacja do grupy",
        name: "+Konsultacja do grupy",
        isFixed: false,
        defaultOrder: 10,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja pierwszorazowa indywidualna",
        name: "+Konsultacja pierwszorazowa indywidualna",
        isFixed: false,
        defaultOrder: 11,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja pierwszorazowa rodzinna",
        name: "+Konsultacja pierwszorazowa rodzinna",
        isFixed: false,
        defaultOrder: 12,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja pierwszorazowa pary ",
        name: "+Konsultacja pierwszorazowa pary ",
        isFixed: false,
        defaultOrder: 13,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja indywidualna",
        name: "+Konsultacja indywidualna",
        isFixed: false,
        defaultOrder: 14,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja z parą",
        name: "+Konsultacja z parą",
        isFixed: false,
        defaultOrder: 15,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja rodzinna",
        name: "+Konsultacja rodzinna",
        isFixed: false,
        defaultOrder: 16,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:konsultacja wsparciowa",
        name: "+konsultacja wsparciowa",
        isFixed: false,
        defaultOrder: 17,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Terapia indywidualna",
        name: "+Terapia indywidualna",
        isFixed: false,
        defaultOrder: 18,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Terapia pary",
        name: "+Terapia pary",
        isFixed: false,
        defaultOrder: 19,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Terapia rodzinna ",
        name: "+Terapia rodzinna ",
        isFixed: false,
        defaultOrder: 20,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja z profesjonalistą ",
        name: "+Konsultacja z profesjonalistą ",
        isFixed: false,
        defaultOrder: 21,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja pierwszorazowa psychiatryczna",
        name: "+Konsultacja pierwszorazowa psychiatryczna",
        isFixed: false,
        defaultOrder: 22,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 60},
        },
      },
      {
        nn: "meetingType:Konsultacja psychiatryczna",
        name: "+Konsultacja psychiatryczna",
        isFixed: false,
        defaultOrder: 23,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Konsultacje psychologiczne"},
          durationMinutes: {kind: "const", value: 30},
        },
      },
      // Category: Wewnętrzne
      {
        nn: "meetingType:Konferencja",
        name: "+Konferencja",
        isFixed: false,
        defaultOrder: 30,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 480},
        },
      },
      {
        nn: "meetingType:Superwizja zespołu z Gerrym Byrnem",
        name: "+Superwizja zespołu z Gerrym Byrnem",
        isFixed: false,
        defaultOrder: 31,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 120},
        },
      },
      {
        nn: "meetingType:Superwizja FDDS z Gerrym Byrnem",
        name: "+Superwizja FDDS z Gerrym Byrnem",
        isFixed: false,
        defaultOrder: 32,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 90},
        },
      },
      {
        nn: "meetingType:Superwizja z Krystyną Mierzejewską-Orzechowską",
        name: "+Superwizja z Krystyną Mierzejewską-Orzechowską",
        isFixed: false,
        defaultOrder: 33,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 150},
        },
      },
      {
        nn: "meetingType:Spotkanie Poradni",
        name: "+Spotkanie Poradni",
        isFixed: false,
        defaultOrder: 34,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Spotkanie Poradni online",
        name: "+Spotkanie Poradni online",
        isFixed: false,
        defaultOrder: 35,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Superwizja I kontaktu",
        name: "+Superwizja I kontaktu",
        isFixed: false,
        defaultOrder: 36,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 90},
        },
      },
      {
        nn: "meetingType:Webinar",
        name: "+Webinar",
        isFixed: false,
        defaultOrder: 37,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Szkolenie",
        name: "+Szkolenie",
        isFixed: false,
        defaultOrder: 38,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Podcast",
        name: "+Podcast",
        isFixed: false,
        defaultOrder: 39,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Debata",
        name: "+Debata",
        isFixed: false,
        defaultOrder: 40,
        isDisabled: false,
        attributes: {
          tegoryDictId: {kind: "nn", nn: "meetingCategory:Wewnętrzne"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      // Category: Profesjonaliści
      {
        nn: "meetingType:Spotkanie monitorujące",
        name: "+Spotkanie monitorujące",
        isFixed: false,
        defaultOrder: 50,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Profesjonaliści"},
          durationMinutes: {kind: "const", value: 120},
        },
      },
      {
        nn: "meetingType:Spotkanie sieciujące",
        name: "+Spotkanie sieciujące",
        isFixed: false,
        defaultOrder: 51,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Profesjonaliści"},
          durationMinutes: {kind: "const", value: 90},
        },
      },
      {
        nn: "meetingType:Szkolenie dla profesjonalistów",
        name: "+Szkolenie dla profesjonalistów",
        isFixed: false,
        defaultOrder: 52,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Profesjonaliści"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      // Category: Grupy
      {
        nn: "meetingType:Grupa LH dla ojców",
        name: "+Grupa LH dla ojców",
        isFixed: false,
        defaultOrder: 60,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Grupa LH dla rodziców",
        name: "+Grupa LH dla rodziców",
        isFixed: false,
        defaultOrder: 61,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Grupa LH Multifamily",
        name: "+Grupa LH Multifamily",
        isFixed: false,
        defaultOrder: 62,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: 'meetingType:Grupa "Oswoić Depresję"',
        name: '+Grupa "Oswoić Depresję"',
        isFixed: false,
        defaultOrder: 63,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Grupa wsparcia dla mam",
        name: "+Grupa wsparcia dla mam",
        isFixed: false,
        defaultOrder: 64,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Grupa wsparcia dla ojców",
        name: "+Grupa wsparcia dla ojców",
        isFixed: false,
        defaultOrder: 65,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: 'meetingType:Grupa "Potrafię się zatrzymać"',
        name: '+Grupa "Potrafię się zatrzymać"',
        isFixed: false,
        defaultOrder: 66,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Grupa psychoedukacyjna",
        name: "+Grupa psychoedukacyjna",
        isFixed: false,
        defaultOrder: 67,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Spotkania edukacyjne",
        name: "+Spotkania edukacyjne",
        isFixed: false,
        defaultOrder: 68,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "nn", nn: "meetingCategory:Grupy"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      // Category: other
      {
        nn: "meetingType:Wyjazd służbowy",
        name: "+Wyjazd służbowy",
        isFixed: false,
        defaultOrder: 70,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "dict", dictName: "meetingCategory", positionName: "other"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
      {
        nn: "meetingType:Media (wywiad/nagranie)",
        name: "+Media (wywiad/nagranie)",
        isFixed: false,
        defaultOrder: 71,
        isDisabled: false,
        attributes: {
          categoryDictId: {kind: "dict", dictName: "meetingCategory", positionName: "other"},
          durationMinutes: {kind: "const", value: 0},
        },
      },
    ],
  },
];

export const attributes: Attribute[] = [];
