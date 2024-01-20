import {activeFacilityId} from "state/activeFacilityId.state";
import {V1} from "../config";
import {SolidQueryOpts} from "../query_utils";
import {ClientResource} from "../resources/client.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseGetListResponse} from "../utils";
import {Users} from "./shared";

/**
 * @see {@link https://test-memo.fdds.pl/api/documentation#/Facility%20client production docs}
 * @see {@link http://localhost:9081/api/documentation#/Facility%20client local docs}
 */
export namespace FacilityClient {
  const getClientsListBase = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    V1.get<Api.Response.GetList<ClientResource>>(`/facility/${activeFacilityId()}/user/client/list`, {
      ...config,
      params: request,
    });
  const getClientsList = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    getClientsListBase(request, config).then(parseGetListResponse);
  const getClient = createGetFromList(getClientsListBase);

  export const keys = {
    client: () => [...Users.keys.user(), "client"] as const,
    clientList: (request?: Api.Request.GetListParams) =>
      [...keys.client(), "list", request, activeFacilityId()] as const,
    clientGet: (id: Api.Id) => [...keys.client(), "list", createListRequest(id), activeFacilityId()] as const,
  };

  export const clientsQueryOptions = (ids: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: ({signal}) => getClientsList(request, {signal}),
      queryKey: keys.clientList(request),
    } satisfies SolidQueryOpts<ClientResource[]>;
  };

  export const clientQueryOptions = (id: Api.Id) =>
    ({
      queryFn: ({signal}) => getClient(id, {signal}),
      queryKey: keys.clientGet(id),
    }) satisfies SolidQueryOpts<ClientResource>;
}
