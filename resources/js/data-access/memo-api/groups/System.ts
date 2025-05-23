import {SolidQueryOptions} from "@tanstack/solid-query";
import {V1} from "data-access/memo-api/config/v1.instance";
import {probablyLoggedIn} from "state/probablyLoggedIn.state";
import {SystemStatusResource} from "../resources/SystemStatusResource";
import {AttributeResource} from "../resources/attribute.resource";
import {DictionaryResource} from "../resources/dictionary.resource";
import {FacilityResource} from "../resources/facility.resource";
import {Api} from "../types";
import {parseGetResponse, parseListResponse} from "../utils";
import {Facilities} from "./shared";

/**
 * @see {@link http://localhost:9081/api/documentation#/System local docs}
 */
export namespace System {
  const getFacilitiesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<FacilityResource>>("/system/facility/list", config).then(parseListResponse);
  export const facilitiesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getFacilitiesList({signal}),
      queryKey: keys.facilityList(),
      // Prevent refetching on every page.
      staleTime: 10 * 60 * 1000,
      refetchOnMount: false,
      enabled: probablyLoggedIn(),
    }) satisfies SolidQueryOptions;

  const getDictionariesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<DictionaryResource>>("/system/dictionary/list", config).then(parseListResponse);
  export const dictionariesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getDictionariesList({signal}),
      queryKey: keys.dictionary(),
      // The dictionaries normally don't change.
      staleTime: 3600 * 1000,
      refetchOnMount: false,
    }) satisfies SolidQueryOptions;

  const getAttributesList = (config?: Api.Config) =>
    V1.get<Api.Response.GetList<AttributeResource>>("/system/attribute/list", config).then(parseListResponse);
  export const attributesQueryOptions = () =>
    ({
      queryFn: ({signal}) => getAttributesList({signal}),
      queryKey: keys.attribute(),
      // The attributes normally don't change.
      staleTime: 3600 * 1000,
      refetchOnMount: false,
    }) satisfies SolidQueryOptions;

  const getStatus = (config?: Api.Config) =>
    V1.get<Api.Response.Get<SystemStatusResource>>("/system/status", config).then(parseGetResponse);
  export const statusQueryOptions = () =>
    ({
      queryFn: ({signal}) => getStatus({signal}),
      queryKey: keys.status(),
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: 60 * 1000,
    }) satisfies SolidQueryOptions;

  export const log = (req: LogRequest, config?: Api.Config) =>
    V1.post<Api.Response.Post<LogResponse>>("/system/log", req, config);

  export interface LogRequest {
    readonly logLevel: LogLevel;
    readonly source: LogAPIFrontendSource;
    readonly message?: string;
    readonly context?: string;
  }

  /** The log source values allowed by the backend. */
  export enum LogAPIFrontendSource {
    // Uncaught JavaScript exception.
    JS_ERROR = "api_fe_js_error",
    // Information about a user making use of a tracked feature (UI analytics).
    FEATURE_USE = "api_fe_feature_use",
    // Report about Content-Security-Policy violation.
    CSP_VIOLATION = "api_fe_csp_violation",
  }

  export type LogLevel = "debug" | "info" | "notice" | "warning" | "error" | "critical" | "alert" | "emergency";

  export interface LogResponse {
    readonly id: Api.Id;
  }

  export const keys = {
    facility: () => [...Facilities.keys.facility(), "system"] as const,
    facilityList: () => [...keys.facility(), "list"] as const,
    dictionary: () => ["dictionary"] as const,
    attribute: () => ["attribute"] as const,
    status: () => ["status"] as const,
  };
}
