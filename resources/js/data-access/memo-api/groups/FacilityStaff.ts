import {activeFacilityId} from "state/activeFacilityId.state";
import {V1} from "../config";
import {SolidQueryOpts} from "../query_utils";
import {StaffResource, StaffResourceForCreate, StaffResourceForPatch} from "../resources/staff.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseListResponse} from "../utils";
import {FacilityUsers} from "./FacilityUsers";

/**
 * @see {@link http://localhost:9081/api/documentation#/Facility%20staff local docs}
 */
export namespace FacilityStaff {
  export const createStaff = (staff: Api.Request.Create<StaffResourceForCreate>, config?: Api.Config) =>
    V1.post<Api.Response.Post>(`/facility/${activeFacilityId()}/user/staff`, staff, config);
  export const updateStaff = (staff: Api.Request.Patch<StaffResourceForPatch>, config?: Api.Config) =>
    V1.patch(`/facility/${activeFacilityId()}/user/staff/${staff.id}`, staff, config);

  const getStaffListBase = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    V1.get<Api.Response.GetList<StaffResource>>(`/facility/${activeFacilityId()}/user/staff/list`, {
      ...config,
      params: request,
    });
  const getStaffList = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    getStaffListBase(request, config).then(parseListResponse);
  const getStaffMember = createGetFromList(getStaffListBase);

  export const keys = {
    staff: () => [...FacilityUsers.keys.user(), "staff"] as const,
    staffList: (request?: Api.Request.GetListParams) => [...keys.staff(), "list", request, activeFacilityId()] as const,
    staffGet: (id: Api.Id) => [...keys.staff(), "get", id, activeFacilityId()] as const,
  };

  export const staffQueryOptions = (ids: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: ({signal}) => getStaffList(request, {signal}),
      queryKey: keys.staffList(request),
    } satisfies SolidQueryOpts<StaffResource[]>;
  };

  export const staffMemberQueryOptions = (id: Api.Id) =>
    ({
      queryFn: ({signal}) => getStaffMember(id, {signal}),
      queryKey: keys.staffGet(id),
    }) satisfies SolidQueryOpts<StaffResource>;
}
