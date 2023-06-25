import { CreateQueryOptions, createQuery } from "@tanstack/solid-query";
import { V1 } from "../config";
import { PermissionsResource, UserResource } from "../resources";
import { MemberResource } from "../resources/member.resource";
import { Api } from "../types";
import { parseGetResponse } from "../utils";

export namespace User {
  export const getStatus = () =>
    V1.get<Api.Response.Get<GetStatusData>>("/user/status").then(
      parseGetResponse
    );

  export const login = (data: LoginRequest) =>
    V1.post<Api.Response.Post>("/user/login", data);

  export const logout = () => V1.post<Api.Response.Post>("/user/logout");

  export const changePassword = (data: ChangePasswordRequest) =>
    V1.post<Api.Response.Post>("/user/password", data);

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

  export const useStatus = (options?: CreateQueryOptions<GetStatusData>) =>
    createQuery({
      queryFn: getStatus,
      queryKey: keys.status,
      ...options,
    });
}
