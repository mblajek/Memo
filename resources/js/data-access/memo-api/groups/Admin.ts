import {useQueryClient} from "@tanstack/solid-query";
import {V1} from "../config";
import {SolidQueryOpts} from "../query_utils";
import {FacilityResource} from "../resources";
import {AdminUserResource, AdminUserResourceForCreate} from "../resources/adminUser.resource";
import {MemberResource} from "../resources/member.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseGetListResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/Admin production docs}
 * @see {@link http://localhost:9081/api/documentation#/Admin local docs}
 */
export namespace Admin {
  export const createFacility = (facility: Api.Request.Create<FacilityResource>) =>
    V1.post<Api.Response.Post>("/admin/facility", facility);
  export const updateFacility = (facilityId: Api.Id, facility: Api.Request.Patch<FacilityResource>) =>
    V1.patch(`/admin/facility/${facilityId}`, facility);

  export const createUser = (user: AdminUserResourceForCreate) => V1.post<Api.Response.Post>("/admin/user", user);
  export const updateUser = (user: Api.Request.Patch<AdminUserResource>) => V1.patch(`/admin/user/${user.id}`, user);
  export const deleteUser = (userId: Api.Id) => V1.delete(`/admin/user/${userId}`);

  const getUsersListBase = (request?: Api.Request.GetListParams) =>
    V1.get<Api.Response.GetList<AdminUserResource>>("/admin/user/list", {params: request});
  export const getUsersList = (request?: Api.Request.GetListParams) =>
    getUsersListBase(request).then(parseGetListResponse);
  export const getUser = createGetFromList(getUsersListBase);

  export const createMember = (member: Api.Request.Create<MemberResource>) => V1.post("/admin/member", member);
  export const updateMember = (member: Api.Request.Patch<MemberResource>) =>
    V1.patch(`/admin/member/${member.id}`, member);
  export const deleteMember = (memberId: Api.Id) => V1.delete(`/admin/member/${memberId}`);

  export const keys = {
    all: () => ["admin"] as const,
    userAll: () => [...keys.all(), "user"] as const,
    userLists: () => [...keys.userAll(), "list"] as const,
    userList: (request?: Api.Request.GetListParams) => [...keys.userLists(), request] as const,
    userGet: (id: Api.Id) => keys.userList(createListRequest(id)),
    facilityAll: () => [...keys.all(), "facility"] as const,
    facilityLists: () => [...keys.facilityAll(), "list"] as const,
  };

  export const usersQueryOptions = (ids?: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: () => getUsersList(request),
      queryKey: keys.userList(request),
    } satisfies SolidQueryOpts<AdminUserResource[]>;
  };

  export const userQueryOptions = (id: Api.Id) =>
    ({
      queryFn: () => getUser(id),
      queryKey: keys.userGet(id),
    }) satisfies SolidQueryOpts<AdminUserResource>;

  export function useInvalidator() {
    const queryClient = useQueryClient();
    return {
      users: () => queryClient.invalidateQueries({queryKey: keys.userLists()}),
    };
  }
}
