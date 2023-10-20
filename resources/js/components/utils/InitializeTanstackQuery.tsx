import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
  type MutationMeta,
  type QueryMeta,
} from "@tanstack/solid-query";
import {isAxiosError} from "axios";
import {System, User} from "data-access/memo-api/groups";
import {SolidQueryOpts} from "data-access/memo-api/query_utils";
import {Api} from "data-access/memo-api/types";
import {translationsLoaded, translationsLoadedPromise} from "i18n_loader";
import {For, ParentComponent, Show, VoidComponent, createMemo, createSignal} from "solid-js";
import toast from "solid-toast";
import {cx, useLangFunc} from ".";
import {MemoLoader} from "../ui/MemoLoader";

/** A list of HTTP response status codes for which a toast should not be displayed. */
type QuietHTTPStatuses = number[];

declare module "@tanstack/query-core" {
  interface QueryMeta {
    quietHTTPStatuses?: QuietHTTPStatuses;
  }
  interface MutationMeta {
    quietHTTPStatuses?: QuietHTTPStatuses;
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
    const status = error.response?.status;
    if (!status || !meta?.quietHTTPStatuses?.includes(status)) {
      const respErrors = error.response?.data.errors;
      const errors = meta?.isFormSubmit
        ? // Validation errors will be handled by the form.
          respErrors?.filter((e) => !Api.isValidationError(e))
        : respErrors;
      if (errors?.length) {
        if (!translationsLoaded()) {
          for (const e of errors) {
            console.warn("Error toast shown (translations not ready):", e);
          }
        }
        translationsLoadedPromise.then(() => {
          const messages = errors.map((e) => {
            return t(e.code, {
              ...(Api.isValidationError(e) ? {attribute: e.field} : undefined),
              ...e.data,
            });
          });
          for (const msg of messages) {
            console.warn(`Error toast shown: ${msg}`);
          }
          toast.error(() => (
            <ul class={cx({"list-disc pl-6": messages.length > 1}, "wrapText")}>
              <For each={messages}>{(msg) => <li>{msg}</li>}</For>
            </ul>
          ));
        });
      }
    }
  }
  const queryClient = createMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnReconnect: true,
            // When opening a page, reload data if it's older than a couple of seconds.
            staleTime: 5 * 1000,
            // By default don't refetch on browser tab change.
            refetchOnWindowFocus: false,
            retry: false,
            // This is very important. The default reconcile algorithm somehow breaks the data and
            // reactivity in complicated ways. This line is basically `broken: false`.
            // See https://github.com/TanStack/query/pull/6125
            // About `reconcile`: https://github.com/TanStack/query/pull/5287
            reconcile: false,
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

/** Prefetch some of the required queries beforehand. */
const InitQueries: VoidComponent = () => {
  const queryClient = useQueryClient();
  const fetchPromises = [System.facilitiesQueryOptions(), User.statusQueryOptions()].map((opts) =>
    queryClient.fetchQuery(opts as SolidQueryOpts<unknown>),
  );
  const [isPrefetching, setIsPrefetching] = createSignal(true);
  Promise.allSettled(fetchPromises).then(() => setIsPrefetching(false));
  return (
    <Show when={isPrefetching()}>
      <MemoLoader />
    </Show>
  );
};
