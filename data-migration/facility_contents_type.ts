import luxon from "./luxon.ts";

type DateTime = luxon.DateTime;

export interface FacilityContents {
  readonly defNn?: readonly DefNN[];

  readonly dictionariesAndAttributes?: DictionaryOrAttributeAction[];

  readonly facilityStaff?: readonly FacilityStaff[];
  readonly clients?: readonly Client[];
  readonly patchClients?: readonly ClientPatch[];
  readonly clientGroups?: readonly ClientGroup[];

  readonly meetings?: readonly Meeting[];
}

export interface DefNN {
  readonly nn: string | readonly string[];
  readonly id: string;
  readonly type: string;
}

export type DictionaryOrAttributeAction = ExtendDictionaryAction | CreateDictionaryAction | CreateAttributeAction;

export interface ExtendDictionaryAction {
  readonly kind: "extendDictionary";
  readonly name: string;
  readonly positions: readonly PositionInExtension[];
}

export interface PositionInExtension extends Position {
  readonly order?: Order<"positionNnOrName">;
}

export interface CreateDictionaryAction {
  readonly kind: "createDictionary";
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

interface CreateAttributeAction {
  readonly kind: "createAttribute";
  readonly nn?: string;
  readonly name: string;
  readonly description?: string;
  readonly model: string;
  readonly apiName: string;
  readonly type: string;
  readonly dictionaryNnOrName?: string;
  readonly order?: Order<"attributeApiName">;
  readonly isMultiValue: boolean;
  readonly requirementLevel: "empty" | "optional" | "recommended" | "required";
}

export type Order<RelKey extends string> = "atStart" | "atEnd" | RelOrder<RelKey>;
export type RelOrder<RelKey extends string> = {readonly rel: "before" | "after"} & RelSpec<RelKey>;
export type RelSpec<RelKey extends string> = Readonly<Record<RelKey, string>>;

interface FacilityStaffBase {
  readonly nn: string | readonly string[];
  readonly isStaff: boolean;
  readonly isAdmin: boolean;
}

export interface NewFacilityStaff extends FacilityStaffBase {
  readonly existing?: false;
  readonly name: string;
  readonly email: string | null;
  readonly password: string | null;
  readonly passwordExpireAt: DateTimeType | null;
  readonly deactivatedAt: DateTimeType | null;
}

export interface ExistingFacilityStaff extends FacilityStaffBase {
  readonly existing: true;
  readonly email: string;
}

export type FacilityStaff = NewFacilityStaff | ExistingFacilityStaff;

export interface Client {
  readonly nn?: string | readonly string[];
  readonly name: string;
  readonly client: AttributeValues;
  readonly createdByNn?: string;
  readonly createdAt?: DateTimeType;
}

export interface ClientPatch {
  readonly id: string;
  readonly nn?: string | readonly string[];
  readonly name?: string;
  readonly client: AttributeValues;
}

export interface ClientGroup {
  readonly nn?: string | readonly string[];
  readonly clients: readonly ClientGroupClient[];
  readonly notes: string | null;
}

export interface ClientGroupClient {
  readonly clientNn: string;
  readonly role: string | null;
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
export type AttributeValue = SingleAttributeValue | readonly SingleAttributeValue[];

export interface Meeting {
  readonly nn?: string;
  readonly typeDictNnOrName: string;
  readonly notes?: string;
  readonly date: string;
  readonly startDayMinute: number;
  readonly durationMinutes: number;
  readonly status: "planned" | "completed" | "cancelled";
  readonly isRemote: boolean;
  readonly staff: readonly StaffAttendant[];
  readonly clients: readonly ClientAttendant[];
  readonly fromMeetingNn?: string;
  readonly interval?: string;
  readonly createdAt?: DateTimeType;
  readonly createdByNn?: string;
  readonly updatedAt?: DateTimeType;
  readonly updatedByNn?: string;
}

interface BaseAttendant {
  readonly userNn: string;
  readonly attendanceStatus: "ok" | "late_present" | "too_late" | "no_show" | "cancelled";
}
export interface StaffAttendant extends BaseAttendant {}
export interface ClientAttendant extends BaseAttendant {
  readonly clientGroupNn?: string;
}

export type DateTimeType = DateTime | string;

export function facilityContentStats(contents: FacilityContents) {
  return `\
  Dictionaries: ${contents.dictionariesAndAttributes?.filter((a) => a.kind === "createDictionary").length || 0} + \
extend ${contents.dictionariesAndAttributes?.filter((a) => a.kind === "extendDictionary").length || 0}
  Attributes: ${contents.dictionariesAndAttributes?.filter((a) => a.kind === "createAttribute").length || 0}
  Facility staff: ${contents.facilityStaff?.length || 0}
  Clients: ${contents.clients?.length || 0} + patch ${contents.patchClients?.length || 0}
  Client groups: ${contents.clientGroups?.length || 0}
  Meetings: ${contents.meetings?.length || 0}
`;
}
