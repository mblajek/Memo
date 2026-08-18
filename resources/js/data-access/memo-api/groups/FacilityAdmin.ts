import {V1} from "data-access/memo-api/config/v1.instance";
import {AttributeResourceForCreate, AttributeResourceForPatch} from "data-access/memo-api/resources/attribute.resource";
import {
  DictionaryResourceForCreate,
  DictionaryResourceForPatch,
  PositionResourceForPatch,
} from "data-access/memo-api/resources/dictionary.resource";
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

  export const createDictionary = (dictionary: DictionaryResourceForCreate) =>
    V1.post<Api.Response.Post>(`/facility/${activeFacilityId()}/admin/dictionary`, dictionary);
  export const updateDictionary = (dictionary: Api.Request.Patch<DictionaryResourceForPatch>) =>
    V1.patch(`/facility/${activeFacilityId()}/admin/dictionary/${dictionary.id}`, dictionary);
  export const deleteDictionary = (dictionaryId: Api.Id) =>
    V1.delete(`/facility/${activeFacilityId()}/admin/dictionary/${dictionaryId}`);

  export const updatePosition = (position: Api.Request.Patch<PositionResourceForPatch>) =>
    V1.patch(`/facility/${activeFacilityId()}/admin/position/${position.id}`, position);
}
