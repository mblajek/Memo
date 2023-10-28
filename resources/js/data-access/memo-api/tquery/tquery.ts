import {createQuery, keepPreviousData} from "@tanstack/solid-query";
import {Accessor, createComputed, createMemo, createSignal, on} from "solid-js";
import {SetStoreFunction, createStore} from "solid-js/store";
import {DataItem, DataRequest, DataResponse, Schema} from ".";
import {V1} from "../config";
import {CreateQueryOpts, SolidQueryOpts} from "../query_utils";

type EntityURL = string;

type PrefixQueryKey = readonly unknown[];

type SchemaQueryKey = readonly ["tquery-schema", EntityURL];
type DataQueryKey<K extends PrefixQueryKey> = readonly [...K, "tquery", EntityURL, DataRequest];

function getRequestFromQueryKey<K extends PrefixQueryKey>(queryKey: DataQueryKey<K>): DataRequest {
  return (queryKey satisfies readonly [...unknown[], DataRequest]).at(-1) as DataRequest;
}

const INITIAL_PAGE_SIZE = 50;

const EMPTY_DATA: DataItem[] = [];

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
    paging: {number: 1, size: INITIAL_PAGE_SIZE},
  });
  const [requestReady, setRequestReady] = createSignal(false);
  createComputed(() => setRequestReady(!!schema()));
  return {
    request: () => (requestReady() ? request : undefined),
    requestController: setRequest,
  };
};

/**
 * Creates a tquery.
 *
 * @param prefixQueryKey The TanStack Query prefix of the data query (can be used to invalidate data).
 * @param entityURL The URL of the tquery endpoint.
 */
export function createTQuery<C, K extends PrefixQueryKey>({
  prefixQueryKey,
  entityURL,
  requestCreator,
  dataQueryOptions,
}: {
  prefixQueryKey: K;
  entityURL: EntityURL;
  requestCreator: RequestCreator<C>;
  dataQueryOptions?: CreateQueryOpts<DataResponse, DataQueryKey<K>>;
}) {
  const schemaQuery = createQuery(() => ({
    queryKey: ["tquery-schema", entityURL] satisfies SchemaQueryKey,
    queryFn: () => V1.get<Schema>(`${entityURL}/tquery`).then((res) => res.data),
    staleTime: Number.POSITIVE_INFINITY,
  }));
  const schema = () => schemaQuery.data;
  const {request, requestController} = requestCreator(schema);
  const dataQuery = createQuery(
    () =>
      ({
        enabled: !!request(),
        queryKey: [...prefixQueryKey, "tquery", entityURL, request()!] satisfies DataQueryKey<K>,
        queryFn: (context) =>
          V1.post<DataResponse>(`${entityURL}/tquery`, getRequestFromQueryKey(context.queryKey)).then(
            (res) => res.data,
          ),
        placeholderData: keepPreviousData,
        ...dataQueryOptions,
      }) satisfies SolidQueryOpts<DataResponse, DataQueryKey<K>>,
  );
  // There seems to be a bug in TanStack Query v5 - the identity of data does not change
  // when data is loaded from the cache. The code below fixes that.
  const data = createMemo(
    on(
      () => dataQuery.dataUpdatedAt,
      () => [...(dataQuery.data?.data || EMPTY_DATA)],
    ),
  );
  // This should work but doesn't:
  // const data = () => dataQuery.data?.data || EMPTY_DATA;
  return {
    schema,
    requestController,
    dataQuery,
    data,
  };
}
