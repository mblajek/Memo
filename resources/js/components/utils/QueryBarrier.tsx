import { CreateQueryResult } from "@tanstack/solid-query";
import { JSX, Match, ParentProps, Switch, mergeProps } from "solid-js";

export interface QueryBarrierProps<TData = unknown, TError = unknown> {
  errorElement?: JSX.Element;
  loadingElement?: JSX.Element;
  query: CreateQueryResult<TData, TError>;
}

export function QueryBarrier<TData = unknown, TError = unknown>(
  props: ParentProps<QueryBarrierProps<TData, TError>>
): JSX.Element {
  const merged = mergeProps(
    { errorElement: <p>error</p>, loadingElement: <p>loading...</p> },
    props
  );

  return (
    <Switch>
      <Match when={props.query.isLoading}>{merged.loadingElement}</Match>
      <Match when={props.query.isError}>{merged.errorElement}</Match>
      <Match when={props.query.isSuccess}>{props.children}</Match>
    </Switch>
  );
}
