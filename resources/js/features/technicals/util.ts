import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {activeFacilityId} from "state/activeFacilityId.state";

/** The intrinsic filter of the facility-scoped tables: the global rows plus the active facility's rows. */
export function facilityScopeFilter(): FilterH {
  const nullFilter: FilterH = {type: "column", column: "facility.id", op: "null"};
  const facilityId = activeFacilityId();
  // The active facility signal can lag briefly behind the route; limit to the global rows until it resolves.
  return facilityId
    ? {type: "op", op: "|", val: [nullFilter, {type: "column", column: "facility.id", op: "=", val: facilityId}]}
    : nullFilter;
}
