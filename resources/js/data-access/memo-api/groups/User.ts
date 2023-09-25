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
  export const getStatus = () => V1.get<Api.Response.Get<GetStatusData>>("/user/status").then(parseGetResponse);

  export const login = (data: LoginRequest) => V1.post<Api.Response.Post>("/user/login", data);
  export const logout = () => V1.post<Api.Response.Post>("/user/logout");
  export const changePassword = (data: ChangePasswordRequest) => V1.post<Api.Response.Post>("/user/password", data);

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
    status: () => [...keys.all(), "status"] as const,
  };

  export const statusQueryOptions = {
    queryFn: getStatus,
    queryKey: keys.status(),
  } satisfies SolidQueryOptions;

  export function useInvalidator() {
    const queryClient = useQueryClient();
    return {
      status: () => queryClient.invalidateQueries({queryKey: keys.status()}),
    };
  }
}
