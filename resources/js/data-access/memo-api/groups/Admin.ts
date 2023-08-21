import {V1} from "../config";
import {AdminUserResource} from "../resources/adminUser.resource";
import {Api} from "../types";
import {parseGetListResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/Admin production docs}
 * @see {@link http://localhost:9081/api/documentation#/Admin local docs}
 */
export namespace Admin {
  export const createFacility = () => V1.post("/admin/facility");

  export const updateFacility = (facilityId: string) => V1.patch(`/admin/facility/${facilityId}`);

  export const getUsers = () =>
    V1.get<Api.Response.GetList<AdminUserResource>>("/admin/user/list").then(parseGetListResponse);

  export const keys = {
    all: () => ["admin"] as const,
    users: () => [...keys.all(), "users"] as const,
  };
}
