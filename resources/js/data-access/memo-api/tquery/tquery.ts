import {CreateQueryOptions, QueryFunction, createQuery, keepPreviousData, useQueryClient} from "@tanstack/solid-query";
import {Accessor, createComputed, createMemo, createSignal, on} from "solid-js";
import {SetStoreFunction, createStore} from "solid-js/store";
import {DataRequest, DataResponse, Schema} from ".";
import {V1} from "../config";
import {Api} from "../types";

type EntityURL = string;

type SchemaQueryKey = ["tquery", EntityURL, "schema"];
type DataQueryKeyBase = ["tquery", EntityURL, "data"];
type DataQueryKey = [...DataQueryKeyBase, DataRequest];

const INITIAL_PAGE_SIZE = 50;

const EMPTY_DATA: object[] = [];

/** A utility that creates and helps with managing the request object. */
export interface RequestCreator<T> {
  (schema: Accessor<Schema | undefined>): {
    /** The request to send, or undefined to disable the query. */
    request: Accessor<DataRequest | undefined>;
    requestController: T;
  };
}

export const DEFAULT_REQUEST_CREATOR: RequestCreator<SetStoreFunction<DataRequest>> = (schema) => {
  const [request, setRequest] = createStore<DataRequest>({
    columns: [],
    sort: [],
    paging: {pageIndex: 0, pageSize: INITIAL_PAGE_SIZE},
  });
  const [requestReady, setRequestReady] = createSignal(false);
  createComputed(() => {
    const sch = schema();
    if (sch) {
      // Update the request with the suggested values once the schema is available.
      setRequest({
        columns: (sch.suggestedColumns ? [...sch.suggestedColumns] : sch.columns.map(({name}) => name)).map(
          (column) => ({type: "column", column}),
        ),
        sort: (sch.suggestedSort || []).map((item) => ({...item})),
      });
      // Make sure the data query is not enabled before this.
      setRequestReady(true);
    }
  });
  return {
    request: () => (requestReady() ? request : undefined),
    requestController: setRequest,
  };
};

export function createTQuery<T>(
  entityURL: EntityURL,
  {
    requestCreator,
    dataQueryOptions,
  }: {
    requestCreator: RequestCreator<T>;
    dataQueryOptions?: CreateQueryOptions<DataResponse, Api.Error, DataResponse, DataQueryKey>;
  },
) {
  const schemaQueryKey: SchemaQueryKey = ["tquery", entityURL, "schema"];
  const fetchSchema: QueryFunction<Schema, SchemaQueryKey> = (context) =>
    V1.get<Schema>(`${context.queryKey[1]}/tquery`).then((res) => res.data);
  const schemaQuery = createQuery<Schema, Api.Error, Schema, SchemaQueryKey>(() => ({
    queryKey: schemaQueryKey,
    queryFn: fetchSchema,
    staleTime: Number.POSITIVE_INFINITY,
  }));
  const schema = () => schemaQuery.data;
  const {request, requestController} = requestCreator(schema);
  const dataQuery = createQuery<DataResponse, Api.Error, DataResponse, DataQueryKey>(() => ({
    queryKey: ["tquery", entityURL, "data", request()!],
    queryFn: (context) =>
      V1.post<DataResponse>(`${context.queryKey[1]}/tquery`, context.queryKey[3]).then((res) => res.data),
    enabled: !!request(),
    placeholderData: keepPreviousData,
    ...dataQueryOptions,
  }));
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
    invalidate: createInvalidator(entityURL),
  };
}

export function createInvalidator(entityURL: EntityURL) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({
      queryKey: ["tquery", entityURL, "data"] satisfies DataQueryKeyBase,
    });
  };
}
