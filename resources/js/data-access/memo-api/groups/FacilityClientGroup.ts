import {activeFacilityId} from "state/activeFacilityId.state";
import {V1} from "../config";
import {SolidQueryOpts} from "../query_utils";
import {ClientGroupResource, ClientGroupResourceForCreate} from "../resources/clientGroup.resource";
import {Api} from "../types";
import {ListInParam, createGetFromList, createListRequest, parseListResponse} from "../utils";

export namespace FacilityClientGroup {
  export const createClientGroup = (group: Api.Request.Create<ClientGroupResourceForCreate>, config?: Api.Config) =>
    V1.post<Api.Response.Post>(`/facility/${activeFacilityId()}/client-group`, group, config);
  export const updateClientGroup = (group: Api.Request.Patch<ClientGroupResource>, config?: Api.Config) =>
    V1.patch(`/facility/${activeFacilityId()}/client-group/${group.id}`, group, config);
  export const deleteClientGroup = (groupId: string, config?: Api.Config) =>
    V1.delete(`/facility/${activeFacilityId()}/client-group/${groupId}`, config);

  const getClientGroupsListBase = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    V1.get<Api.Response.GetList<ClientGroupResource>>(`/facility/${activeFacilityId()}/client-group/list`, {
      ...config,
      params: request,
    });
  const getClientGroupsList = (request?: Api.Request.GetListParams, config?: Api.Config) =>
    getClientGroupsListBase(request, config).then(parseListResponse);
  const getClient = createGetFromList(getClientGroupsListBase);

  export const keys = {
    clientGroup: () => ["facility", "clientGroup"] as const,
    clientGroupList: (request?: Api.Request.GetListParams) =>
      [...keys.clientGroup(), "list", request, activeFacilityId()] as const,
    clientGroupGet: (id: Api.Id) => [...keys.clientGroup(), "get", id, activeFacilityId()] as const,
  };

  export const clientGroupsQueryOptions = (ids: ListInParam) => {
    const request = createListRequest(ids);
    return {
      queryFn: ({signal}) => getClientGroupsList(request, {signal}),
      queryKey: keys.clientGroupList(request),
    } satisfies SolidQueryOpts<ClientGroupResource[]>;
  };

  export const clientGroupQueryOptions = (id: Api.Id) =>
    ({
      queryFn: ({signal}) => getClient(id, {signal}),
      queryKey: keys.clientGroupGet(id),
    }) satisfies SolidQueryOpts<ClientGroupResource>;
}
