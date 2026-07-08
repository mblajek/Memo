/**
 * @fileoverview Simplified types for use with TanStack Query. They assume that
 * TError = AxiosError<Api.ErrorResponse> and TData = TQueryFnData, which is the common case.
 */

import {QueryKey, QueryOptions} from "@tanstack/solid-query";
import {AxiosError} from "axios";
import {Api} from "./types";

export type QueryError = AxiosError<Api.ErrorResponse>;

export type SolidQueryOpts<DataType, QueryKeyType extends QueryKey = QueryKey> = QueryOptions<
  DataType,
  QueryError,
  DataType,
  QueryKeyType
>;
