import {SolidQueryOptions, useQueryClient} from "@tanstack/solid-query";
import {V1} from "../config";
import {FacilityResource} from "../resources";
import {Api} from "../types";
import {parseGetListResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/System production docs}
 * @see {@link http://localhost:9081/api/documentation#/System local docs}
 */
export namespace System {
  export const getFacilitiesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<FacilityResource>>("/system/facility/list", config).then(parseGetListResponse);
  export const facilitiesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getFacilitiesList({signal}),
      queryKey: keys.facilityList(),
    }) satisfies SolidQueryOptions;

  export const keys = {
    all: () => ["system"] as const,
    facility: () => [...keys.all(), "facility"] as const,
    facilityList: () => [...keys.facility(), "list"] as const,
  };

  export function useInvalidator() {
    const queryClient = useQueryClient();
    return {
      facilities: () => queryClient.invalidateQueries({queryKey: keys.facilityList()}),
    };
  }
}
