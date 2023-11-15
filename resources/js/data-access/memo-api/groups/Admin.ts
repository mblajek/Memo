import {useQueryClient} from "@tanstack/solid-query";
import {V1} from "../config";
import {SolidQueryOpts} from "../query_utils";
import {AdminUserResource, AdminUserResourceForCreate} from "../resources/adminUser.resource";
import {FacilityResource} from "../resources/facility.resource";
import {MemberResource} from "../resources/member.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseGetListResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/Admin production docs}
 * @see {@link http://localhost:9081/api/documentation#/Admin local docs}
 */
export namespace Admin {
  export const createFacility = (facility: Api.Request.Create<FacilityResource>, config?: Api.Config) =>
    V1.post<Api.Response.Post>("/admin/facility", facility, config);
  export const updateFacility = (facility: Api.Request.Patch<FacilityResource>, config?: Api.Config) =>
    V1.patch(`/admin/facility/${facility.id}`, facility, config);

  export const createUser = (user: AdminUserResourceForCreate, config?: Api.Config) =>
    V1.post<Api.Response.Post>("/admin/user", user, config);
  export const updateUser = (user: Api.Request.Patch<AdminUserResource>, config?: Api.Config) =>
    V1.patch(`/admin/user/${user.id}`, user, config);
  export const deleteUser = (userId: Api.Id, config?: Api.Config) => V1.delete(`/admin/user/${userId}`, config);

  const getUsersListBase = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    V1.get<Api.Response.GetList<AdminUserResource>>("/admin/user/list", {...config, params: request});
  const getUsersList = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    getUsersListBase(request, config).then(parseGetListResponse);
  const getUser = createGetFromList(getUsersListBase);

  export const createMember = (member: Api.Request.Create<MemberResource>, config?: Api.Config) =>
    V1.post("/admin/member", member, config);
  export const updateMember = (member: Api.Request.Patch<MemberResource>, config?: Api.Config) =>
    V1.patch(`/admin/member/${member.id}`, member, config);
  export const deleteMember = (memberId: Api.Id, config?: Api.Config) => V1.delete(`/admin/member/${memberId}`, config);

  export const keys = {
    all: () => ["admin"] as const,
    user: () => [...keys.all(), "user"] as const,
    userList: (request?: Api.Request.GetListParams) => [...keys.user(), "list", request] as const,
    userGet: (id: Api.Id) => keys.userList(createListRequest(id)),
    facility: () => [...keys.all(), "facility"] as const,
  };

  export const usersQueryOptions = (ids?: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: ({signal}) => getUsersList(request, {signal}),
      queryKey: keys.userList(request),
    } satisfies SolidQueryOpts<AdminUserResource[]>;
  };

  export const userQueryOptions = (id: Api.Id) =>
    ({
      queryFn: ({signal}) => getUser(id, {signal}),
      queryKey: keys.userGet(id),
    }) satisfies SolidQueryOpts<AdminUserResource>;

  export function useInvalidator() {
    const queryClient = useQueryClient();
    return {
      users: () => queryClient.invalidateQueries({queryKey: keys.user()}),
      facilities: () => queryClient.invalidateQueries({queryKey: keys.facility()}),
    };
  }
}
