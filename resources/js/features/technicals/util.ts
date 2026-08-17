import {useParams} from "@solidjs/router";
import {FilterH} from "data-access/memo-api/tquery/filter_utils";
import {activeFacilityId} from "state/activeFacilityId.state";

/**
 * Mode of the technicals pages, determined by the mount point: under a facility URL the pages
 * are scoped to that facility (facility admin), otherwise they are unscoped (global admin).
 */
export function useTechnicalsMode() {
  const params = useParams();
  const facilityMode = () => !!params.facilityUrl;
  /** Base path of the technicals pages in the current mode, for links between the pages. */
  const basePath = () => (params.facilityUrl ? `/${params.facilityUrl}/admin/technicals` : "/admin/technicals");
  /**
   * The intrinsic filter for the current mode: in facility mode limits rows to the global ones
   * plus those of the active facility, in global mode undefined (no limiting).
   */
  const scopeFilter = (): FilterH | undefined => {
    if (!facilityMode()) {
      return undefined;
    }
    const nullFilter: FilterH = {type: "column", column: "facility.id", op: "null"};
    const facilityId = activeFacilityId();
    // The active facility signal can lag briefly behind the route; limit to the global rows until it resolves.
    return facilityId
      ? {type: "op", op: "|", val: [nullFilter, {type: "column", column: "facility.id", op: "=", val: facilityId}]}
      : nullFilter;
  };
  return {facilityMode, basePath, scopeFilter};
}
