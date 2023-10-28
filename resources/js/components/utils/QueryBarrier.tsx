import {CreateQueryResult} from "@tanstack/solid-query";
import {Match, ParentProps, Switch, VoidComponent, mergeProps} from "solid-js";
import {BigSpinner} from "../ui";

export interface QueryBarrierProps {
  /**
   * Component to show, when query is in error state
   */
  Error?: VoidComponent;
  /**
   * Component to show, when query is in pending state
   */
  Pending?: VoidComponent;
  /**
   * List of queries to handle
   */
  queries: CreateQueryResult<unknown, unknown>[];
}

/**
 * Default handler for tanstack/solid-query's `createQuery` result
 *
 * @todo better looking Error
 */
export function QueryBarrier(props: ParentProps<QueryBarrierProps>) {
  const merged = mergeProps(
    {
      // TODO: dedicated Error element
      Error: LocalError,
      Pending: LocalSpinner,
    },
    props,
  );

  const isError = () => merged.queries.some(({isError}) => isError);
  const isSuccess = () => merged.queries.every(({isSuccess}) => isSuccess);
  const isPending = () => !isError() && !isSuccess();

  return (
    <Switch>
      <Match when={isError()}>
        <merged.Error />
      </Match>
      <Match when={isPending()}>
        <merged.Pending />
      </Match>
      <Match when={isSuccess()}>{props.children}</Match>
    </Switch>
  );
}

const LocalSpinner = () => <BigSpinner />;

const LocalError = () => <p>error</p>;
