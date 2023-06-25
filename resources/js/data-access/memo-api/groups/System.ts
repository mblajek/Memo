import { CreateQueryOptions, createQuery } from "@tanstack/solid-query";
import { V1 } from "../config";
import { FacilityResource } from "../resources";
import { Api } from "../types";
import { parseGetListResponse } from "../utils";

export namespace System {
  export const getFacilitiesList = () =>
    V1.get<Api.Response.GetList<FacilityResource>>(
      "/system/facility/list"
    ).then(parseGetListResponse);

  export const useFacilitiesList = (
    options?: CreateQueryOptions<FacilityResource[]>
  ) =>
    createQuery({
      queryFn: getFacilitiesList,
      queryKey: keys.facilityList,
      ...options,
    });

  export const keys = {
    all: () => ["system"] as const,

    facilityAll: () => [...keys.all(), "facility"] as const,
    facilityList: () => [...keys.facilityLists()] as const,
    facilityLists: () => [...keys.facilityAll(), "list"] as const,
  };
}
