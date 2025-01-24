import {Api} from "data-access/memo-api/types";

export const SUBTYPE_FACILITY_WIDE = "facilityWide";

export interface WorkTimeFormSubtype {
  readonly formId: string;
  readonly typeDictId: string;
  readonly staff: {readonly id: Api.Id} | typeof SUBTYPE_FACILITY_WIDE;
}
