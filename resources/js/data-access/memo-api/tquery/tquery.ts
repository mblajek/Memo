import {useQuery, keepPreviousData} from "@tanstack/solid-query";
import {AxiosError} from "axios";
import {Accessor, createComputed, createSignal} from "solid-js";
import {SetStoreFunction, createStore} from "solid-js/store";
import {V1} from "data-access/memo-api/config/v1.instance";
import {SolidQueryOpts} from "../query_utils";
import {Api} from "../types";
import {DataRequest, DataResponse, Schema} from "./types";

type EntityURL = string;

type PrefixQueryKey = readonly unknown[];

type SchemaQueryKey = readonly ["tquery-schema", EntityURL | undefined];
type DataQueryKey<K extends PrefixQueryKey> = readonly [...K, "tquery", EntityURL | undefined, DataRequest];

function getRequestFromQueryKey<K extends PrefixQueryKey>(queryKey: DataQueryKey<K>): DataRequest {
  return (queryKey satisfies readonly [...unknown[], DataRequest]).at(-1) as DataRequest;
}

const INITIAL_PAGE_SIZE = 50;

/** A utility that creates and helps with managing the request object. */
export interface RequestCreator<C> {
  (schema: Accessor<Schema | undefined>): {
    /** The request to send, or undefined to disable the query. */
    request: Accessor<DataRequest | undefined>;
    requestController: C;
  };
}

export const DEFAULT_REQUEST_CREATOR: RequestCreator<SetStoreFunction<DataRequest>> = (schema) => {
  const [request, setRequest] = createStore<DataRequest>({
    columns: [],
    sort: [],
    paging: {size: INITIAL_PAGE_SIZE},
  });
  const [requestReady, setRequestReady] = createSignal(false);
  createComputed(() => setRequestReady(!!schema()));
  return {
    request: () => (requestReady() ? request : undefined),
    requestController: setRequest,
  };
};

/** A function for creating a request creator with a request that is a simple accessor or function of schema. */
export function staticRequestCreator(
  request: DataRequest | ((schema: Schema) => DataRequest | undefined),
): RequestCreator<undefined> {
  return (schema) => ({
    request: () => {
      if (typeof request === "function") {
        const sch = schema();
        return sch ? request(sch) : undefined;
      }
      return request;
    },
    requestController: undefined,
  });
}

type ExtraDataQueryOptions<K extends PrefixQueryKey> = Partial<SolidQueryOpts<DataResponse, DataQueryKey<K>>>;

const EMPTY_RESPONSE: DataResponse = {meta: {totalDataSize: 0}, data: []};

/**
 * Creates a tquery.
 *
 * @param prefixQueryKey The TanStack Query prefix of the data query (can be used to invalidate data).
 * @param entityURL The URL of the tquery endpoint. Undefined to disable the query.
 */
export function createTQuery<C, K extends PrefixQueryKey>({
  prefixQueryKey,
  entityURL,
  requestCreator,
  dataQueryOptions,
}: {
  prefixQueryKey: K | Accessor<K>;
  entityURL: EntityURL | undefined | Accessor<EntityURL | undefined>;
  requestCreator: RequestCreator<C>;
  dataQueryOptions?: ExtraDataQueryOptions<K> | Accessor<ExtraDataQueryOptions<K>>;
}) {
  const extraDataQueryOptions: Accessor<ExtraDataQueryOptions<K>> =
    typeof dataQueryOptions === "function" ? dataQueryOptions : () => dataQueryOptions || {};
  const entityURLFunc = typeof entityURL === "function" ? entityURL : () => entityURL;
  const schemaQuery = useQuery(() => ({
    queryKey: ["tquery-schema", entityURLFunc()] satisfies SchemaQueryKey,
    queryFn: () => V1.get<Schema>(`${entityURLFunc()}/tquery`).then((res) => res.data),
    staleTime: 3600 * 1000,
    refetchOnMount: false,
    enabled: !!entityURLFunc(),
  }));
  const schema = () => schemaQuery.data;
  const {request, requestController} = requestCreator(schema);
  const dataQuery = useQuery<DataResponse, AxiosError<Api.ErrorResponse>, DataResponse, DataQueryKey<K>>(() => ({
    queryKey: [
      ...(typeof prefixQueryKey === "function" ? prefixQueryKey() : prefixQueryKey),
      "tquery",
      entityURLFunc(),
      request()!,
    ] satisfies DataQueryKey<K>,
    queryFn: (context) => {
      const request = getRequestFromQueryKey(context.queryKey);
      if (request.filter === "never") {
        return EMPTY_RESPONSE;
      }
      return V1.post<DataResponse>(`${entityURLFunc()}/tquery`, request).then((res) => res.data);
    },
    placeholderData: keepPreviousData,
    // It is difficult to match the types here because of the defined/undefined initial data types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...(extraDataQueryOptions?.() as any),
    enabled: !!entityURLFunc() && !!request() && extraDataQueryOptions().enabled !== false,
  }));
  return {
    schema,
    request,
    requestController,
    dataQuery,
  };
}
