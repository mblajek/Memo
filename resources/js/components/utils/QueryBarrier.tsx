import {UseQueryResult} from "@tanstack/solid-query";
import {For, JSX, Match, ParentProps, Show, Switch, VoidComponent, createEffect, mergeProps} from "solid-js";
import {BigSpinner} from "../ui/Spinner";

export interface QueryBarrierProps {
  /** List of queries to handle. */
  readonly queries: readonly UseQueryResult<unknown, unknown>[];
  /**
   * If set, the barrier waits until the first fetch is done, even if data was available in the cache.
   * See `Query.isFetchedAfterMount`.
   */
  readonly ignoreCachedData?: boolean;
  /** Elements to show when query is in error state. */
  readonly error?: (queries: readonly UseQueryResult<unknown, unknown>[]) => JSX.Element;
  /** Elements to show when query is in pending state. */
  readonly pending?: () => JSX.Element;
}

/**
 * Default handler for tanstack/solid-query's `useQuery` result
 *
 * @todo better looking Error
 */
export function QueryBarrier(allProps: ParentProps<QueryBarrierProps>) {
  const props = mergeProps(
    {
      error: () => <SimpleErrors queries={props.queries} />,
      pending: () => <BigSpinner />,
    },
    allProps,
  );
  createEffect(() => {
    if (props.ignoreCachedData) {
      // We expect all queries to have fresh (not cached) data, so force fetch on those queries
      // that didn't start their first fetch yet.
      for (const query of props.queries) {
        if (!query.isFetchedAfterMount && query.fetchStatus === "idle") {
          void query.refetch();
        }
      }
    }
  });
  return (
    <Switch>
      <Match when={props.queries.some(({isError}) => isError)}>{props.error(props.queries)}</Match>
      <Match
        when={props.queries.every((query) => query.isSuccess && (!props.ignoreCachedData || query.isFetchedAfterMount))}
      >
        {props.children}
      </Match>
      <Match when="pending">{props.pending()}</Match>
    </Switch>
  );
}

export type QueryErrorsProps = Pick<QueryBarrierProps, "queries">;

export const SimpleErrors: VoidComponent<QueryErrorsProps> = (props) => (
  <div class="text-red-700 wrapTextAnywhere">
    <p class="font-bold">Errors:</p>
    <ul class="list-disc font-mono ml-6">
      <For each={props.queries}>
        {(query) => (
          <Show when={query.isError}>
            <li>{JSON.stringify(query.error)}</li>
          </Show>
        )}
      </For>
    </ul>
  </div>
);
