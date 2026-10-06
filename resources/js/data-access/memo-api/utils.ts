import {AxiosError, AxiosHeaders, type AxiosResponse} from "axios";
import {DateTime} from "luxon";
import {FacilityIdOrGlobal} from "state/activeFacilityId.state";
import {Api} from "./types";

export const parseGetResponse = <T extends object>(res: AxiosResponse<Api.Response.Get<T>>) => res.data.data;

export const parseListResponse = <T>(res: AxiosResponse<Api.Response.List<T>>) => res.data.data;

export const parsePostResponse = <T>(res: AxiosResponse<Api.Response.Post<T>>) => res.data.data;

/** An id or an array of id that can be passed to a list request. */
export type ListInParam = Api.Id | readonly Api.Id[];

/**
 * Returns a list request. If the argument is an array, the ids are sorted to ensure deterministic
 * value, which makes the value suitable for a query key.
 */
export function createListRequest(inParam?: ListInParam): Api.Request.GetListParams {
  return Array.isArray(inParam) ? (inParam.length ? {in: inParam.toSorted().join(",")} : {}) : {in: inParam};
}

export function byId<T extends Api.Entity>(list: T[] | undefined): Map<Api.Id, T> {
  const result = new Map();
  for (const entity of list || []) {
    result.set(entity.id, entity);
  }
  return result;
}

export const UUID_REGEX = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

/** Creates a fake AxiosError with the not found status, for a request that found no entity. */
function entityNotFoundError(response?: AxiosResponse) {
  const config = response?.config || {headers: new AxiosHeaders()};
  return new AxiosError("Entity not found", AxiosError.ERR_BAD_REQUEST, config, response?.request, {
    headers: {},
    config,
    ...response,
    data: {errors: [{code: "exception.not_found"}]} satisfies Api.ErrorResponse,
    status: 404,
    statusText: "NotFound",
  });
}

/**
 * Returns a function for getting entity by id, made from a list calling function.
 *
 * The get request uses list with the in param under the hood, and throws an appropriate
 * fake AxiosError if the entity is not found. An id that is not a UUID cannot belong to any
 * entity, so it gives the same error, without a request that would be rejected as invalid.
 */
export function createGetFromList<T extends Api.Entity>(
  getEntityListBase: (
    request: Api.Request.GetListParams,
    config?: Api.Config,
  ) => Promise<AxiosResponse<Api.Response.GetList<T>>>,
) {
  return async (id: Api.Id, config?: Api.Config) => {
    if (!UUID_REGEX.test(id)) {
      throw entityNotFoundError();
    }
    const response = await getEntityListBase(createListRequest(id), config);
    const [result] = response.data.data;
    if (!result) {
      throw entityNotFoundError(response);
    }
    return result;
  };
}

/** Returns the ISO representation of datetime in UTC time zone, suitable for sending to backend. */
export function dateTimeToISO(dateTime: DateTime) {
  return dateTime.toUTC().set({millisecond: 0}).toISO({suppressMilliseconds: true});
}

/** Returns the ISO representation of date, suitable for sending to backend. Local time zone is used. */
export function dateToISO(dateTime: DateTime) {
  return dateTime.toISODate();
}

/**
 * Determines if the resource specifying a facility id matches the specified facility id matcher.
 * A resource with null facility id matches everything. A resource with a specific facility id
 * matches only that facility id.
 */
export function facilityIdMatches(resourceFacilityId: string | null, matchFacilityIdOrGlobal: FacilityIdOrGlobal) {
  return resourceFacilityId === null || resourceFacilityId === matchFacilityIdOrGlobal;
}
