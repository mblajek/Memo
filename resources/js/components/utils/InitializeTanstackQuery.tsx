import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  createQuery,
  type MutationMeta,
  type QueryMeta,
} from "@tanstack/solid-query";
import {isAxiosError} from "axios";
import {System, User} from "data-access/memo-api";
import {Api} from "data-access/memo-api/types";
import {For, ParentComponent, Show, VoidComponent, createMemo} from "solid-js";
import toast from "solid-toast";
import {useLangFunc} from ".";
import {MemoLoader} from "../ui";

declare module "@tanstack/query-core" {
  interface QueryMeta {
    quietError?: boolean;
  }
  interface MutationMeta {
    quietError?: boolean;
    isFormSubmit?: boolean;
  }
}

/**
 * Tanstack/solid-query initialization component
 *
 * Handles custom queryClient and queryCache initialization
 */
export const InitializeTanstackQuery: ParentComponent = (props) => {
  const t = useLangFunc();
  function toastErrors(error: Error, meta?: Partial<QueryMeta & MutationMeta>) {
    if (!isAxiosError<Api.ErrorResponse>(error)) return;
    if ((error?.status && error.status >= 500) || !meta?.quietError) {
      let errors = error.response?.data.errors;
      if (meta?.isFormSubmit) {
        // Validation errors will be handled by the form.
        errors = errors?.filter((e) => !Api.isValidationError(e));
      }
      if (errors?.length)
        toast.error(() => (
          <ul class={errors!.length > 1 ? "list-disc pl-6" : undefined}>
            <For each={errors}>
              {(e) => (
                <li>
                  {t(e.code, {
                    ...(Api.isValidationError(e) ? {attribute: e.field} : undefined),
                    ...e.data,
                  })}
                </li>
              )}
            </For>
          </ul>
        ));
    }
  }
  const queryClient = createMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnReconnect: true,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            retry: false,
            retryOnMount: false,
          },
        },
        queryCache: new QueryCache({
          onError(error, query) {
            toastErrors(error, query.meta);
          },
        }),
        mutationCache: new MutationCache({
          onError(error, _variables, _context, mutation) {
            toastErrors(error, mutation.meta);
          },
        }),
      }),
  );
  return (
    <QueryClientProvider client={queryClient()}>
      <InitQueries />
      {props.children}
    </QueryClientProvider>
  );
};

/** Initialize some of the required queries beforehand, but don't block on them. */
const InitQueries: VoidComponent = () => {
  const queries = [createQuery(System.facilitiesQueryOptions), createQuery(User.statusQueryOptions)];
  return (
    <Show when={queries.some((q) => q.isLoading)}>
      <MemoLoader />
    </Show>
  );
};
