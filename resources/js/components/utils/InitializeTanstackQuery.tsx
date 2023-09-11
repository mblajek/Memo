import {
  MutationCache,
  type MutationMeta,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  type QueryMeta,
  createQuery,
} from "@tanstack/solid-query";
import {isAxiosError} from "axios";
import {MemoLoader} from "components/ui";
import {System} from "data-access/memo-api";
import {Api} from "data-access/memo-api/types";
import {For, ParentComponent, createMemo} from "solid-js";
import toast from "solid-toast";
import {useLangFunc} from ".";
import {QueryBarrier} from "./QueryBarrier";

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
      <Content>{props.children}</Content>
    </QueryClientProvider>
  );
};

/**
 * Initialize some of required queries beforehand
 */
const Content: ParentComponent = (props) => {
  const facilitiesQuery = createQuery(System.facilitiesQueryOptions);

  return (
    <QueryBarrier
      queries={[facilitiesQuery]}
      pendingElement={
        <div class="h-screen flex justify-center items-center">
          <MemoLoader size={300} />
        </div>
      }
    >
      {props.children}
    </QueryBarrier>
  );
};
