/**
 * @fileoverview Simplified types for use with TanStack Query. They assume that
 * TError = Api.Error and TData = TQueryFnData, which is the common case.
 */

import {CreateQueryOptions, QueryKey, SolidQueryOptions} from "@tanstack/solid-query";
import {Api} from "./types";

export type SolidQueryOpts<DataType, QueryKeyType extends QueryKey = QueryKey> = SolidQueryOptions<
  DataType,
  Api.Error,
  DataType,
  QueryKeyType
>;

export type CreateQueryOpts<DataType, QueryKeyType extends QueryKey = QueryKey> = CreateQueryOptions<
  DataType,
  Api.Error,
  DataType,
  QueryKeyType
>;
