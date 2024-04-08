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
  readonly positions: readonly PositionInExtension[];
}

export interface PositionInExtension extends Position {
  readonly order: "atStart" | "atEnd" | PositionOrderRelative;
}

interface PositionOrderRelative {
  readonly rel: "before" | "after";
  readonly positionNnOrName: string;
}

export interface Dictionary {
  readonly nn?: string;
  readonly name: string;
  readonly positionRequiredAttributeApiNames?: readonly string[];
  readonly positions: readonly Position[];
}

export interface Position {
  readonly nn?: string;
  readonly name: string;
  readonly isDisabled?: boolean;
  readonly attributes?: AttributeValues;
}

export interface Attribute {
  readonly nn?: string;
  readonly model: string;
  readonly name: string;
  readonly apiName: string;
  readonly type: string;
  readonly dictionaryNnOrName?: string;
  readonly order: "atStart" | "atEnd" | AttributeOrderRelative;
  readonly isMultiValue: boolean;
  readonly requirementLevel: "empty" | "optional" | "recommended" | "required";
}

interface AttributeOrderRelative {
  readonly rel: "before" | "after";
  readonly attributeApiName: string;
}

/** New user with staff member role to create. */
export interface Staff {
  readonly nn: string;
  readonly name: string;
  readonly email: string;
}

/** Existing user to give staff in the facility. */
export interface GiveStaff {
  readonly nn?: string;
  readonly id: string;
}

export interface Client {
  readonly nn?: string;
  readonly name: string;
  readonly client: AttributeValues;
  readonly createdByNn?: string;
  readonly createdAt: string;
}

export interface AttributeValues {
  readonly [apiName: string]: AttributeValue | undefined;
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
  readonly nn?: string;
  readonly typeDictNnOrName: string;
  readonly notes?: string;
  readonly date: string;
  readonly startDayMinute: number;
  readonly durationMinutes: number;
  readonly status: "planned" | "completed" | "cancelled";
  readonly isRemote: boolean;
  readonly staff: readonly Attendant[];
  readonly clients: readonly Attendant[];
  readonly fromMeetingNn?: string;
}

export interface Attendant {
  readonly userNn: string;
  readonly attendanceStatus: "ok" | "late_present" | "too_late" | "no_show" | "cancelled";
}

export function facilityContentStats(contents: FacilityContents) {
  return `\
  Dictionaries: ${contents.dictionaries.length} + extend ${contents.extendDictionaries.length}
  Attributes: ${contents.attributes.length}
  Staff: ${contents.staff.length} + give ${contents.giveStaff.length}
  Clients: ${contents.clients.length}
  Meetings: ${contents.meetings.length}
`;
}
