import {useQueryClient} from "@tanstack/solid-query";
import {V1} from "../config";
import {SolidQueryOpts} from "../query_utils";
import {FacilityResource} from "../resources";
import {AdminUserResource} from "../resources/adminUser.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseGetListResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/Admin production docs}
 * @see {@link http://localhost:9081/api/documentation#/Admin local docs}
 */
export namespace Admin {
  export const createFacility = (facility: Api.Request.Create<FacilityResource>) =>
    V1.post("/admin/facility", facility);
  export const updateFacility = (facilityId: Api.Id, facility: Api.Request.Patch<FacilityResource>) =>
    V1.patch(`/admin/facility/${facilityId}`, facility);

  export const createUser = (user: Api.Request.Create<AdminUserResource>) => V1.post("/admin/user", user);
  export const updateUser = (user: Api.Request.Patch<AdminUserResource>) => V1.patch(`/admin/user/${user.id}`, user);

  const getUsersListBase = (request?: Api.Request.GetListParams) =>
    V1.get<Api.Response.GetList<AdminUserResource>>("/admin/user/list", {params: request});
  export const getUsersList = (request?: Api.Request.GetListParams) =>
    getUsersListBase(request).then(parseGetListResponse);
  export const getUser = createGetFromList(getUsersListBase);

  export const keys = {
    all: () => ["admin"] as const,
    userAll: () => [...keys.all(), "user"] as const,
    userLists: () => [...keys.userAll(), "list"] as const,
    userList: (request?: Api.Request.GetListParams) => [...keys.userLists(), request] as const,
    userGet: (id: Api.Id) => keys.userList(createListRequest(id)),
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
