import { CreateQueryResult } from "@tanstack/solid-query";
import { ImSpinner2 } from "solid-icons/im";
import type { Component, ParentProps } from "solid-js";
import { Match, Switch, mergeProps } from "solid-js";

export interface QueryBarrierProps {
  /**
   * Component to show, when query is in error state
   */
  Error?: Component;
  /**
   * Component to show, when query is in pending state
   */
  Pending?: Component;
  /**
   * List of queries to handle
   */
  queries: CreateQueryResult[];
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
    props
  );

  const isError = () => merged.queries.some(({ isError }) => isError);
  const isSuccess = () => merged.queries.every(({ isSuccess }) => isSuccess);
  const isPending = () => !isError() && !isSuccess();

  return (
    <Switch>
      <Match when={isError()}>{<merged.Error />}</Match>
      <Match when={isPending()}>{<merged.Pending />}</Match>
      <Match when={isSuccess()}>{props.children}</Match>
    </Switch>
  );
}

const LocalSpinner = () => (
  <div class="flex justify-center items-center">
    <ImSpinner2 size={50} class="animate-spin" />,
  </div>
);

const LocalError = () => <p>error</p>;
