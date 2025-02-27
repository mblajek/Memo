import {MutationCache, QueryCache, QueryClient, QueryClientProvider, useQueryClient} from "@tanstack/solid-query";
import {isAxiosError} from "axios";
import {useLangFunc} from "components/utils/lang";
import {getOriginalResponseForUnexpectedError} from "data-access/memo-api/config/v1.instance";
import {translateError} from "data-access/memo-api/error_util";
import {System} from "data-access/memo-api/groups/System";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {SolidQueryOpts} from "data-access/memo-api/query_utils";
import {isFilterValError} from "data-access/memo-api/tquery/table";
import {Api} from "data-access/memo-api/types";
import {translationsLoaded, translationsLoadedPromise} from "i18n_loader";
import {ParentComponent, Show, VoidComponent, createMemo, createSignal} from "solid-js";
import {MemoLoader} from "../ui/MemoLoader";
import {ToastMessages, toastDismiss, toastError} from "./toast";

/** A list of HTTP response status codes for which a toast should not be displayed. */
type QuietHTTPStatuses = number[];

declare module "@tanstack/solid-query" {
  interface Register {
    readonly queryMeta: QueryMeta;
    readonly mutationMeta: MutationMeta;
  }
}

interface QueryMeta {
  readonly quietHTTPStatuses?: QuietHTTPStatuses;
  readonly tquery?: TQueryMeta;
}

export interface TQueryMeta {
  readonly isTable?: boolean;
}

interface MutationMeta {
  readonly quietHTTPStatuses?: QuietHTTPStatuses;
  readonly isFormSubmit?: boolean;
}

/**
 * Tanstack/solid-query initialization component
 *
 * Handles custom queryClient and queryCache initialization
 */
export const InitializeTanstackQuery: ParentComponent = (props) => {
  const t = useLangFunc();
  /** The ids of error toasts for form submits. They get dismissed when submitting again. */
  const formErrorToasts: string[] = [];

  function toastErrors(queryClient: QueryClient, error: Error, meta?: Partial<QueryMeta & MutationMeta>) {
    const invalidate = useInvalidator(queryClient);
    if (!isAxiosError<Api.ErrorResponse>(error)) {
      return;
    }
    const status = error.response?.status;
    if (!status || !meta?.quietHTTPStatuses?.includes(status)) {
      const respErrors = error.response?.data.errors;
      let errorsToShow: readonly Api.Error[] = [];
      if (respErrors) {
        // Make sure user status is refreshed if any query reports unauthorised. Don't do this for forms though.
        if (!meta?.isFormSubmit && respErrors.some((e) => e.code === "exception.unauthorised")) {
          invalidate.userStatusAndFacilityPermissions({clearCache: true});
        }
        if (meta?.isFormSubmit) {
          // Validation errors will be handled by the form.
          errorsToShow = respErrors.filter((e) => !Api.isValidationError(e));
        } else if (meta?.tquery?.isTable) {
          // Table filter value errors will be handled by the table.
          /**
           * A list of serious errors, not caused by bad filter val. Excludes also the exception.validation error
           * which might be caused by just the filter val errors.
           */
          const seriousErrors = respErrors.filter((e) => e.code !== "exception.validation" && !isFilterValError(e));
          if (seriousErrors.length) {
            // Include the exception.validation error again.
            errorsToShow = respErrors.filter((e) => !isFilterValError(e));
          }
        } else {
          errorsToShow = respErrors;
        }
      }
      if (errorsToShow.length) {
        if (!translationsLoaded()) {
          for (const e of errorsToShow) {
            console.warn("Error toast shown (translations not ready):", e);
          }
        }
        translationsLoadedPromise.then(() => {
          if (errorsToShow.length) {
            const messages = errorsToShow.map((e) => translateError(e, t));
            for (const msg of messages) {
              console.warn(`Error toast shown: ${msg}`);
            }
            // Don't show multiple "unauthorised" toasts, this is an error that typically occurs on all the active queries,
            // so use id to display just a single toast.
            let toastId =
              errorsToShow.length === 1 && errorsToShow[0]!.code === "exception.unauthorised"
                ? "exception.unauthorised"
                : undefined;
            toastId = toastError(() => <ToastMessages messages={messages} />, {id: toastId});
            if (meta?.isFormSubmit) {
              formErrorToasts.push(toastId);
            }
          }
        });
      }
    }
  }

  const queryClient = createMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnReconnect: false,
            refetchOnMount: true,
            refetchOnWindowFocus: false,
            // When opening a page, reload data if it's older than half a minute.
            staleTime: 30 * 1000,
            retry: (failureCount, error) => {
              const isUnexpected =
                isAxiosError<Api.ErrorResponse>(error) &&
                error.response?.status === 500 &&
                error.response.data.errors.some((e) => e.code === "exception.unexpected");
              if (isUnexpected) {
                const original = getOriginalResponseForUnexpectedError(error.response!.data);
                if (original?.contentType?.match(/^text\b/)) {
                  toastError(() => (
                    <div class="flex flex-col">
                      <div class="text-lg font-bold">Internal Server Error</div>
                      <div>{String(original.data)}</div>
                    </div>
                  ));
                }
              }
              return failureCount <= 2 && isUnexpected;
            },
            retryDelay: 500,
          },
        },
        queryCache: new QueryCache({
          onError(error, query) {
            toastErrors(queryClient(), error, query.meta);
          },
        }),
        mutationCache: new MutationCache({
          onMutate(variables, mutation) {
            if (mutation.meta?.isFormSubmit) {
              // Clear any earlier validation errors from form submits.
              for (const id of formErrorToasts) {
                toastDismiss(id);
              }
              formErrorToasts.length = 0;
            }
          },
          onError(error, variables, context, mutation) {
            toastErrors(queryClient(), error, mutation.meta);
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
