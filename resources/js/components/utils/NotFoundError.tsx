import {useLocation} from "@solidjs/router";
import {isAxiosError} from "axios";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {Show, VoidComponent, createEffect, createMemo} from "solid-js";
import {QueryBarrierProps, QueryErrorsProps, SimpleErrors} from "./QueryBarrier";
import {useLangFunc} from "./lang";

interface Props extends QueryErrorsProps {
  readonly fallback?: QueryBarrierProps["error"];
}

/**
 * An error for the QueryBarrier showing a 404 screen if it's a 404 error, or falling back to
 * the standard error.
 */
export const NotFoundError: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const error = createMemo(() => {
    if (props.queries.length !== 1) {
      return undefined;
    }
    const query = props.queries[0]!;
    if (!query.isError || !isAxiosError(query.error)) {
      return undefined;
    }
    return query.error;
  });
  const isNotFoundError = () => error()?.response?.status === 404;
  const location = useLocation();
  const debugMessage = () => {
    const e = error();
    if (!e) {
      return undefined;
    }
    return JSON.stringify({
      location: {
        pathname: location.pathname,
      },
      request: {
        method: e.config?.method,
        baseURL: e.config?.baseURL,
        url: e.config?.url,
        params: e.config?.params,
      },
    });
  };
  const invalidate = useInvalidator();
  createEffect(() => {
    if (isNotFoundError()) {
      console.error("404 response:", error());
      invalidate.everythingThrottled();
    }
  });
  return (
    <Show
      when={isNotFoundError()}
      fallback={
        <Show when={props.fallback} fallback={<SimpleErrors {...props} />}>
          {(fallback) => fallback()(props.queries)}
        </Show>
      }
    >
      <div class="w-fit bg-blue-50 m-2 p-4 rounded-md">
        <h1 class="text-xl text-center mb-2">{t("errors.resource_not_found.title")}</h1>
        <p>{t("errors.resource_not_found.body")}</p>
        <p class="mt-4 text-xs">
          {t("errors.resource_not_found.debug_message_header")}
          <br />
          <span class="whitespace-pre-wrap wrapTextAnywhere font-mono">{debugMessage()}</span>
        </p>
      </div>
    </Show>
  );
};

export function notFoundError() {
  return {error: (queries) => <NotFoundError queries={queries} />} satisfies Partial<QueryBarrierProps>;
}
