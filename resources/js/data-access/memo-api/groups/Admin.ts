import {V1} from "data-access/memo-api/config/v1.instance";
import {SolidQueryOpts} from "../query_utils";
import {AdminFacilityResource, AdminFacilityResourceForCreate} from "../resources/adminFacility.resource";
import {
  AdminUserResource,
  AdminUserResourceForCreate,
  AdminUserResourceForPatch,
} from "../resources/adminUser.resource";
import {MemberResource} from "../resources/member.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseListResponse} from "../utils";
import {Facilities, Users} from "./shared";

/**
 * @see {@link http://localhost:9081/api/documentation#/Admin local docs}
 */
export namespace Admin {
  const getFacilitiesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<AdminFacilityResource>>("/admin/facility/list", config).then(parseListResponse);
  export const facilitiesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getFacilitiesList({signal}),
      queryKey: keys.facilityList(),
    }) satisfies SolidQueryOpts<readonly AdminFacilityResource[]>;

  export const createFacility = (facility: Api.Request.Create<AdminFacilityResourceForCreate>) =>
    V1.post<Api.Response.Post>("/admin/facility", facility);
  export const updateFacility = (facility: Api.Request.Patch<AdminFacilityResource>) =>
    V1.patch(`/admin/facility/${facility.id}`, facility);

  export const createUser = (user: AdminUserResourceForCreate) => V1.post<Api.Response.Post>("/admin/user", user);
  export const updateUser = (user: Api.Request.Patch<AdminUserResourceForPatch>) =>
    V1.patch(`/admin/user/${user.id}`, user);
  export const deleteUser = (userId: Api.Id) => V1.delete(`/admin/user/${userId}`);

  const getUsersListBase = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    V1.get<Api.Response.GetList<AdminUserResource>>("/admin/user/list", {...config, params: request});
  const getUsersList = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    getUsersListBase(request, config).then(parseListResponse);
  const getUser = createGetFromList(getUsersListBase);

  export const createMember = (member: Api.Request.Create<MemberResource>) => V1.post("/admin/member", member);
  export const updateMember = (member: Api.Request.Patch<MemberResource>) =>
    V1.patch(`/admin/member/${member.id}`, member);
  export const deleteMember = (memberId: Api.Id) => V1.delete(`/admin/member/${memberId}`);

  export const createDbDump = (dump: {isFromRc: boolean}) => V1.post("/admin/db-dump", dump);
  export const restoreDbDump = (dump: {id: Api.Id; isToRc: boolean}) =>
    V1.post(`/admin/db-dump/${dump.id}/restore`, {isToRc: dump.isToRc});

  export const keys = {
    user: () => [...Users.keys.user(), "admin"] as const,
    userList: (request?: Api.Request.GetListParams) => [...keys.user(), "list", request] as const,
    userGet: (id: Api.Id) => [...keys.user(), "get", id] as const,
    facility: () => [...Facilities.keys.facility(), "admin"] as const,
    facilityList: () => [...keys.facility(), "list"] as const,
    dbDump: () => ["dbDump"] as const,
  };

  export const usersQueryOptions = (ids?: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: ({signal}) => getUsersList(request, {signal}),
      queryKey: keys.userList(request),
    } satisfies SolidQueryOpts<readonly AdminUserResource[]>;
  };

  export const userQueryOptions = (id: Api.Id) =>
    ({
      queryFn: ({signal}) => getUser(id, {signal}),
      queryKey: keys.userGet(id),
    }) satisfies SolidQueryOpts<AdminUserResource>;
}
