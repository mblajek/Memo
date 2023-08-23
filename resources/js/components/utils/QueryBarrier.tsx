import {CreateQueryResult} from "@tanstack/solid-query";
import {JSX, Match, ParentProps, Switch, mergeProps} from "solid-js";
import {Spinner} from "../ui";

export interface QueryBarrierProps {
  /**
   * Element to show, when query is in error state
   */
  errorElement?: JSX.Element;
  /**
   * Element to show, when query is in pending state
   */
  pendingElement?: JSX.Element;
  /**
   * List of queries to handle
   */
  queries: CreateQueryResult<unknown, unknown>[];
}

/**
 * Default handler for tanstack/solid-query's `createQuery` result
 *
 * @todo better looking errorElement
 */
export function QueryBarrier(props: ParentProps<QueryBarrierProps>) {
  const merged = mergeProps(
    {
      // TODO: dedicated Error element
      errorElement: <p>error</p>,
      pendingElement: <Spinner />,
    },
    props,
  );

  const isError = () => merged.queries.some(({isError}) => isError);
  const isSuccess = () => merged.queries.every(({isSuccess}) => isSuccess);
  const isPending = () => !isError() && !isSuccess();

  return (
    <Switch>
      <Match when={isError()}>{merged.errorElement}</Match>
      <Match when={isPending()}>{merged.pendingElement}</Match>
      <Match when={isSuccess()}>{props.children}</Match>
    </Switch>
  );
}
