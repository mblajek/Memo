import {SolidQueryOptions} from "@tanstack/solid-query";
import {activeFacilityId} from "state/activeFacilityId.state";
import {V1} from "../config";
import {MemberResource} from "../resources/member.resource";
import {PermissionsResource} from "../resources/permissions.resource";
import {UserResource} from "../resources/user.resource";
import {Api, JSONValue} from "../types";
import {parseGetResponse} from "../utils";
import {Users} from "./shared";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/User production docs}
 * @see {@link http://localhost:9081/api/documentation#/User local docs}
 */
export namespace User {
  const getStatus = (config?: Api.Config) =>
    V1.get<Api.Response.Get<GetStatusData>>(
      activeFacilityId() ? `/user/status/${activeFacilityId()}` : "/user/status",
      config,
    ).then(parseGetResponse);

  export const login = (data: LoginRequest, config?: Api.Config<LoginRequest>) =>
    V1.post<Api.Response.Post>("/user/login", data, config);
  export const developerLogin = (data: DeveloperLoginRequest, config?: Api.Config<DeveloperLoginRequest>) =>
    V1.post<Api.Response.Post>("/user/login", data, config);

  export const logout = (config?: Api.Config) => V1.post<Api.Response.Post>("/user/logout", {}, config);

  export const changePassword = (data: ChangePasswordRequest, config?: Api.Config) =>
    V1.post<Api.Response.Post>("/user/password", data, config);

  export const setLastLoginFacilityId = (lastLoginFacilityId: Api.Id, config?: Api.Config) =>
    V1.patch("/user", {lastLoginFacilityId}, config);

  export const storageList = (config?: Api.Config) =>
    V1.get<readonly string[]>("/user/storage", config).then((res) => res.data);
  export const storageGet = (key: string, config?: Api.Config) =>
    V1.get<JSONValue>(`/user/storage/${key}`, config).then((res) => res.data);
  export const storagePut = (key: string, value: JSONValue, config?: Api.Config) =>
    V1.put<readonly string[]>(`/user/storage/${key}`, value, {
      ...config,
      headers: {"Content-Type": "application/json"},
      transformRequest: (data) => JSON.stringify(data),
    });

  type PermissionsFacilityKeys = "facilityId" | "facilityMember" | "facilityClient" | "facilityStaff" | "facilityAdmin";
  // Ensure these are really keys.
  type _FacilityPermissions = Pick<PermissionsResource, PermissionsFacilityKeys>;

  export interface GetStatusData {
    readonly user: UserResource;
    readonly permissions: Partial<PermissionsResource> & Omit<PermissionsResource, PermissionsFacilityKeys>;
    readonly members: MemberResource[];
  }

  export interface LoginRequest {
    readonly email: string;
    readonly password: string;
  }

  export interface DeveloperLoginRequest {
    readonly developer: boolean;
  }

  export interface ChangePasswordRequest {
    readonly current: string;
    readonly password: string;
    readonly repeat: string;
  }

  export const keys = {
    all: () => [...Users.keys.user()] as const,
    statusAll: () => [...keys.all(), "status"] as const,
    status: () => [...keys.statusAll(), activeFacilityId()] as const,
    storage: () => [...keys.all(), "storage"] as const,
    storageList: () => [...keys.storage(), "list"] as const,
    storageEntry: (key: string) => [...keys.storage(), "entry", key] as const,
  };

  export const statusQueryOptions = () =>
    ({
      // Do not allow aborting the request as the non-facility parts of the response are useful in all contexts,
      // and aborting might invalidate the cache.
      queryFn: (): Promise<GetStatusData> => getStatus(),
      queryKey: keys.status(),
      // Prevent displaying toast when user is not logged in - the login page will be displayed.
      meta: {quietHTTPStatuses: [401]},
      refetchOnMount: false,
      refetchOnWindowFocus: true,
      refetchInterval: 60 * 1000,
    }) satisfies SolidQueryOptions<GetStatusData>;

  export const storageListQueryOptions = () =>
    ({
      queryFn: () => storageList(),
      queryKey: keys.storageList(),
    }) satisfies SolidQueryOptions<readonly string[]>;

  export const storageEntryQueryOptions = <T extends JSONValue>(key: string) =>
    ({
      queryFn: () => storageGet(key) as Promise<T | null>,
      queryKey: keys.storageEntry(key),
    }) satisfies SolidQueryOptions<T | null>;
}
