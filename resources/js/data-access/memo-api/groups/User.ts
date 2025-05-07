import {keepPreviousData, SolidQueryOptions} from "@tanstack/solid-query";
import {V1} from "data-access/memo-api/config/v1.instance";
import {activeFacilityId} from "state/activeFacilityId.state";
import {MemberResource} from "../resources/member.resource";
import {PermissionsResource} from "../resources/permissions.resource";
import {UserResource} from "../resources/user.resource";
import {Api, JSONValue} from "../types";
import {parseGetResponse} from "../utils";
import {Users} from "./shared";

/**
 * @see {@link http://localhost:9081/api/documentation#/User local docs}
 */
export namespace User {
  export const login = (data: LoginRequest, config?: Api.Config<LoginRequest>) =>
    V1.post<Api.Response.Post>("/user/login", data, config);
  export const developerLogin = (data: DeveloperLoginRequest, config?: Api.Config<DeveloperLoginRequest>) =>
    V1.post<Api.Response.Post>("/user/login", data, config);

  export interface LoginRequest {
    readonly email: string;
    readonly password: string;
  }

  export interface DeveloperLoginRequest {
    readonly developer: boolean;
  }

  export const logout = (config?: Api.Config) => V1.post<Api.Response.Post>("/user/logout", {}, config);

  export const changePassword = (data: ChangePasswordRequest, config?: Api.Config) =>
    V1.post<Api.Response.Post>("/user/password", data, config);
  export const generateOTP = (data: {password: string}, config?: Api.Config) =>
    V1.post<Api.Response.Post<GenerateOTPResponse>>("/user/otp/generate", data, config);
  export const configureOTP = (data: {otp: string}, config?: Api.Config) =>
    V1.post<Api.Response.Post>("/user/otp/configure", data, config);

  export interface ChangePasswordRequest {
    readonly current: string;
    readonly password: string;
    readonly repeat: string;
  }

  export interface GenerateOTPResponse {
    readonly otpSecret: string;
    readonly validUntil: string;
  }

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
    readonly members: readonly MemberResource[];
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
      queryFn: () =>
        V1.get<Api.Response.Get<GetStatusData>>(
          activeFacilityId() ? `/user/status/${activeFacilityId()}` : "/user/status",
        ).then(parseGetResponse),
      queryKey: keys.status(),
      placeholderData: keepPreviousData,
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
