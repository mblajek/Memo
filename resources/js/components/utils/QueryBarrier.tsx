import { CreateQueryResult } from "@tanstack/solid-query";
import { ImSpinner2 } from "solid-icons/im";
import { JSX, Match, ParentProps, Switch, mergeProps } from "solid-js";

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
  queries: CreateQueryResult[];
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
      pendingElement: (
        <div class="flex justify-center items-center">
          <ImSpinner2 size={50} class="animate-spin" />,
        </div>
      ),
    },
    props
  );

  const isError = () => merged.queries.some(({ isError }) => isError);
  const isSuccess = () => merged.queries.every(({ isSuccess }) => isSuccess);
  const isPending = () => !isError() && !isSuccess();

  return (
    <Switch>
      <Match when={isError()}>{merged.errorElement}</Match>
      <Match when={isPending()}>{merged.pendingElement}</Match>
      <Match when={isSuccess()}>{props.children}</Match>
    </Switch>
  );
}
