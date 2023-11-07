import {CreateQueryResult} from "@tanstack/solid-query";
import {Match, ParentProps, Switch, VoidComponent, createEffect, mergeProps, on} from "solid-js";
import {BigSpinner} from "../ui/Spinner";

export interface QueryBarrierProps {
  /** List of queries to handle. */
  queries: CreateQueryResult<unknown, unknown>[];
  /**
   * If set, the barrier waits until the first fetch is done, even if data was available in the cache.
   * See `Query.isFetchedAfterMount`.
   */
  ignoreCachedData?: boolean;
  /** Component to show when query is in error state. */
  Error?: VoidComponent;
  /** Component to show when query is in pending state. */
  Pending?: VoidComponent;
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
      Error: LocalError,
      Pending: LocalSpinner,
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
      <Match when={isError()}>
        <props.Error />
      </Match>
      <Match when={isPending()}>
        <props.Pending />
      </Match>
      <Match when={isSuccess()}>{props.children}</Match>
    </Switch>
  );
}

const LocalSpinner = () => <BigSpinner />;

const LocalError = () => <p>error</p>;
