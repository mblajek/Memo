export interface FacilityContents {
  readonly dictionaries: readonly Dictionary[];
  readonly extendDictionaries: readonly DictionaryExtension[];
  readonly attributes: readonly Attribute[];

  readonly staff: readonly Staff[];
  readonly giveStaff: readonly GiveStaff[];
  readonly clients: readonly Client[];

  readonly meetings: readonly Meeting[];
}

export interface DictionaryExtension {
  readonly name: string;
  readonly positions: readonly Position[];
}

export interface Dictionary extends DictionaryExtension {
  readonly nn: string;
  readonly isFixed: boolean;
  readonly isExtendable: boolean;
  readonly positionRequiredAttributeIds: readonly string[] | null;
}

export interface Position {
  readonly nn: string;
  readonly name: string;
  readonly isFixed: boolean;
  readonly defaultOrder: number;
  readonly isDisabled: boolean;
  readonly attributes?: AttributeValues;
}

export interface Attribute {
  readonly nn: string;
  readonly model: string;
  readonly name: string;
  readonly apiName: string;
  readonly type: string;
  readonly dictionaryName: string | null;
  readonly isFixed: boolean;
  readonly defaultOrder: number;
  readonly isMultiValue: boolean | null;
  readonly requirementLevel: "empty" | "optional" | "recommended" | "required";
}

/** New user with staff member role to create. */
export interface Staff {
  readonly nn: string;
  readonly name: string;
  readonly email: string;
}

/** Existing user to give staff in the facility. */
export interface GiveStaff {
  readonly id: string;
}

export interface Client {
  readonly nn: string;
  readonly name: string;
  readonly client: AttributeValues;
}

export interface AttributeValues {
  readonly [attributeNnOrApiName: string]: AttributeValue;
}

export interface ConstAttributeValue {
  readonly kind: "const";
  readonly value: unknown;
}

export interface NnAttributeValue {
  readonly kind: "nn";
  readonly nn: string;
}

export interface ExistingDictAttributeValue {
  readonly kind: "dict";
  readonly dictName: string;
  readonly positionName: string;
}

export type SingleAttributeValue = ConstAttributeValue | NnAttributeValue | ExistingDictAttributeValue;
export type AttributeValue = SingleAttributeValue | SingleAttributeValue[];

export interface Meeting {
  readonly nn: string;
  readonly typeDictNnOrName: string;
  readonly notes: string | null;
  readonly date: string;
  readonly startDayMinute: number;
  readonly durationMinutes: number;
  readonly status: "planned" | "completed" | "cancelled";
  readonly isRemote: boolean;
  readonly staff: readonly Attendant[];
  readonly clients: readonly Attendant[];
  readonly fromMeetingNn: string | null;
}

export interface Attendant {
  readonly userNn: string;
  readonly attendanceStatus: "ok" | "late_present" | "too_late" | "no_show" | "cancelled";
}
