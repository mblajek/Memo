/**
 * @fileoverview Simplified types for use with TanStack Query. They assume that
 * TError = AxiosError<Api.ErrorResponse> and TData = TQueryFnData, which is the common case.
 */

import {QueryKey, SolidQueryOptions} from "@tanstack/solid-query";
import {AxiosError} from "axios";
import {Api} from "./types";

export type QueryError = AxiosError<Api.ErrorResponse>;

export type SolidQueryOpts<DataType, QueryKeyType extends QueryKey = QueryKey> = SolidQueryOptions<
  DataType,
  QueryError,
  DataType,
  QueryKeyType
>;
