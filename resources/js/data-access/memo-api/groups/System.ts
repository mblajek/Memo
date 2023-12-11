import {SolidQueryOptions, useQueryClient} from "@tanstack/solid-query";
import {V1} from "../config";
import {AttributeResource} from "../resources/attribute.resource";
import {DictionaryResource} from "../resources/dictionary.resource";
import {FacilityResource} from "../resources/facility.resource";
import {Api} from "../types";
import {parseGetListResponse} from "../utils";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/System production docs}
 * @see {@link http://localhost:9081/api/documentation#/System local docs}
 */
export namespace System {
  const getFacilitiesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<FacilityResource>>("/system/facility/list", config).then(parseGetListResponse);
  export const facilitiesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getFacilitiesList({signal}),
      queryKey: keys.facilityList(),
      // Prevent refetching on every page.
      staleTime: 10 * 60 * 1000,
    }) satisfies SolidQueryOptions;

  const getDictionariesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<DictionaryResource>>("/system/dictionary/list", config).then(parseGetListResponse);
  export const dictionariesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getDictionariesList({signal}),
      queryKey: keys.dictionary(),
      // The dictionaries normally don't change.
      staleTime: 3600 * 1000,
    }) satisfies SolidQueryOptions;

  const getAttributesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<AttributeResource>>("/system/attribute/list", config).then(parseGetListResponse);
  export const attributesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getAttributesList({signal}),
      queryKey: keys.attribute(),
      // The attributes normally don't change.
      staleTime: 3600 * 1000,
    }) satisfies SolidQueryOptions;

  export const keys = {
    all: () => ["system"] as const,
    facility: () => [...keys.all(), "facility"] as const,
    facilityList: () => [...keys.facility(), "list"] as const,
    dictionary: () => [...keys.all(), "dictionary"] as const,
    attribute: () => [...keys.all(), "attribute"] as const,
  };

  export function useInvalidator() {
    const queryClient = useQueryClient();
    return {
      facilities: () => queryClient.invalidateQueries({queryKey: keys.facilityList()}),
      dictionaries: () => queryClient.invalidateQueries({queryKey: keys.dictionary()}),
      attributes: () => queryClient.invalidateQueries({queryKey: keys.attribute()}),
    };
  }
}
