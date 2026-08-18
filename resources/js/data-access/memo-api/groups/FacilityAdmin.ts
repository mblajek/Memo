import {V1} from "data-access/memo-api/config/v1.instance";
import {AttributeResourceForCreate, AttributeResourceForPatch} from "data-access/memo-api/resources/attribute.resource";
import {FacilityAdminResourceForPatch} from "data-access/memo-api/resources/facilityAdmin.resource";
import {activeFacilityId} from "state/activeFacilityId.state";
import {Api} from "../types";

/**
 * @see {@link http://localhost:9081/api/documentation#/Facility%20admin local docs}
 */
export namespace FacilityAdmin {
  export const updateFacilityAdmin = (user: Api.Request.Patch<FacilityAdminResourceForPatch>) =>
    V1.patch(`/facility/${activeFacilityId()}/user/admin/${user.id}`, user);

  export const createAttribute = (attribute: AttributeResourceForCreate) =>
    V1.post<Api.Response.Post>(`/facility/${activeFacilityId()}/admin/attribute`, attribute);
  export const updateAttribute = (attribute: Api.Request.Patch<AttributeResourceForPatch>) =>
    V1.patch(`/facility/${activeFacilityId()}/admin/attribute/${attribute.id}`, attribute);
  export const deleteAttribute = (attributeId: Api.Id) =>
    V1.delete(`/facility/${activeFacilityId()}/admin/attribute/${attributeId}`);
}
