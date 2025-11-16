import {V1} from "data-access/memo-api/config/v1.instance";
import {FacilityAdminResourceForPatch} from "data-access/memo-api/resources/facilityAdmin.resource";
import {activeFacilityId} from "state/activeFacilityId.state";
import {Api} from "../types";

/**
 * @see {@link http://localhost:9081/api/documentation#/Facility%20admin local docs}
 */
export namespace FacilityAdmin {
  export const updateFacilityAdmin = (user: Api.Request.Patch<FacilityAdminResourceForPatch>) =>
    V1.patch(`/facility/${activeFacilityId()}/user/admin/${user.id}`, user);
}
