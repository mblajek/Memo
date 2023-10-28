import {SolidQueryOptions, useQueryClient} from "@tanstack/solid-query";
import {V1} from "../config";
import {PermissionsResource, UserResource} from "../resources";
import {MemberResource} from "../resources/member.resource";
import {Api} from "../types";
import {parseGetResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/User production docs}
 * @see {@link http://localhost:9081/api/documentation#/User local docs}
 */
export namespace User {
  export const getStatus = (facilityId?: string, config?: Api.Config) =>
    V1.get<Api.Response.Get<GetStatusData>>(facilityId ? `/user/status/${facilityId}` : "/user/status", config).then(
      parseGetResponse,
    );

  export const login = (data: LoginRequest, config?: Api.Config<LoginRequest>) =>
    V1.post<Api.Response.Post>("/user/login", data, config);

  export const logout = (config?: Api.Config) => V1.post<Api.Response.Post>("/user/logout", {}, config);

  export const changePassword = (data: ChangePasswordRequest, config?: Api.Config) =>
    V1.post<Api.Response.Post>("/user/password", data, config);

  export type GetStatusData = {
    user: UserResource;
    permissions: PermissionsResource;
    members: MemberResource[];
  };

  export type LoginRequest = {
    email: string;
    password: string;
  };

  export type ChangePasswordRequest = {
    current: string;
    password: string;
    repeat: string;
  };

  export const keys = {
    all: () => ["user"] as const,
    status: (facilityId?: string) => [...keys.all(), "status", facilityId] as const,
  };

  export const statusQueryOptions = (facilityId?: string) =>
    ({
      queryFn: ({signal}) => getStatus(facilityId, {signal}),
      queryKey: keys.status(facilityId),
    }) satisfies SolidQueryOptions;

  export function useInvalidator() {
    const queryClient = useQueryClient();
    return {
      status: () => queryClient.invalidateQueries({queryKey: keys.status()}),
    };
  }
}
