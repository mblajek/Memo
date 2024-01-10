import {CreateQueryResult} from "@tanstack/solid-query";
import {JSX, Match, ParentProps, Switch, createEffect, mergeProps, on} from "solid-js";
import {BigSpinner} from "../ui/Spinner";

export interface QueryBarrierProps {
  /** List of queries to handle. */
  readonly queries: readonly CreateQueryResult<unknown, unknown>[];
  /**
   * If set, the barrier waits until the first fetch is done, even if data was available in the cache.
   * See `Query.isFetchedAfterMount`.
   */
  readonly ignoreCachedData?: boolean;
  /** Elements to show when query is in error state. */
  readonly error?: () => JSX.Element;
  /** Elements to show when query is in pending state. */
  readonly pending?: () => JSX.Element;
}

/**
 * Default handler for tanstack/solid-query's `createQuery` result
 *
 * @todo better looking Error
 */
export function QueryBarrier(allProps: ParentProps<QueryBarrierProps>) {
  const props = mergeProps(
    {
      // TODO: dedicated Error element
      error: () => <LocalError />,
      pending: () => <LocalSpinner />,
    },
    allProps,
  );
  createEffect(
    // Don't rerun when fields on queries change, just the top level props.
    on([() => props.queries, () => props.ignoreCachedData], ([queries, ignoreCachedData]) => {
      if (ignoreCachedData) {
        // We expect all queries to have fresh (not cached) data, so force fetch on those queries
        // that didn't start their first fetch yet.
        for (const query of queries) {
          if (!query.isFetchedAfterMount && !query.isFetching) {
            query.refetch();
          }
        }
      }
    }),
  );
  const isError = () => props.queries.some(({isError}) => isError);
  const isSuccess = () =>
    props.queries.every((query) => query.isSuccess && (!props.ignoreCachedData || query.isFetchedAfterMount));
  const isPending = () => !isError() && !isSuccess();

  return (
    <Switch>
      <Match when={isError()}>{props.error()}</Match>
      <Match when={isPending()}>{props.pending()}</Match>
      <Match when={isSuccess()}>{props.children}</Match>
    </Switch>
  );
}

const LocalSpinner = () => <BigSpinner />;

const LocalError = () => <p>error</p>;
