import {MutationCache, QueryCache, QueryClient, QueryClientProvider, useQuery} from "@tanstack/solid-query";
import {AxiosError, isAxiosError} from "axios";
import {useLangFunc} from "components/utils/lang";
import {getOriginalResponseForUnexpectedError} from "data-access/memo-api/config/v1.instance";
import {translateError} from "data-access/memo-api/error_util";
import {User} from "data-access/memo-api/groups/User";
import {useInvalidator} from "data-access/memo-api/invalidator";
import {isFilterValError} from "data-access/memo-api/tquery/table";
import {Api} from "data-access/memo-api/types";
import {translationsLoaded, translationsLoadedPromise} from "i18n_loader";
import {ParentComponent, Show, VoidComponent, createEffect, createMemo} from "solid-js";
import {activeFacilityId, setActiveFacilityId} from "state/activeFacilityId.state";
import {setProbablyLoggedIn} from "state/probablyLoggedIn.state";
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

export interface QueryMeta {
  readonly quietHTTPStatuses?: QuietHTTPStatuses;
  readonly tquery?: TQueryMeta;
}

export interface TQueryMeta {
  readonly isTable?: boolean;
}

export interface MutationMeta {
  readonly quietHTTPStatuses?: QuietHTTPStatuses;
  readonly isFormSubmit?: boolean;
  readonly getErrorsToShow?: (
    errorsToShow: readonly Api.Error[],
    errorResp: AxiosError<Api.ErrorResponse>,
  ) => readonly Api.Error[];
}

/**
 * Tanstack/solid-query initialization component
 *
 * Handles custom queryClient and queryCache initialization
 */
export const InitializeTanstackQuery: ParentComponent = (props) => {
  const t = useLangFunc();
  /** The ids of error toasts that should be dismissed when a next form is being submitted. */
  const transientErrorToasts: string[] = [];

  function toastErrors(queryClient: QueryClient, error: Error, meta?: Partial<QueryMeta & MutationMeta>) {
    const invalidate = useInvalidator(queryClient);
    if (!isAxiosError<Api.ErrorResponse>(error)) {
      return;
    }
    const status = error.response?.status;
    if (!status || !meta?.quietHTTPStatuses?.includes(status)) {
      const respErrors = error.response?.data.errors;
      if (respErrors) {
        let errorsToShow = respErrors;
        const isUnauthorisedError = respErrors.some((e) => e.code === "exception.unauthorised");
        // Make sure user status is refreshed if any query reports unauthorised. Don't do this for forms though.
        if (!meta?.isFormSubmit && isUnauthorisedError) {
          invalidate.userStatusAndFacilityPermissions({clearCache: true});
        }
        const csrfTokenMismatchError = respErrors.find((e) => e.code === "exception.csrf_token_mismatch");
        if (csrfTokenMismatchError) {
          errorsToShow = [csrfTokenMismatchError];
          // Fetch the new token.
          invalidate.systemStatus();
        } else if (meta?.isFormSubmit) {
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
        }
        if (meta?.getErrorsToShow) {
          errorsToShow = meta.getErrorsToShow(errorsToShow, error);
        }
        if (errorsToShow.length) {
          if (!translationsLoaded()) {
            for (const e of errorsToShow) {
              console.warn("Error toast shown (translations not ready):", e);
            }
          }
          void translationsLoadedPromise.then(() => {
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
              if (isUnauthorisedError || meta?.isFormSubmit) {
                transientErrorToasts.push(toastId);
              }
            }
          });
        }
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
              for (const id of transientErrorToasts) {
                toastDismiss(id);
              }
              transientErrorToasts.length = 0;
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

const InitQueries: VoidComponent = () => {
  const statusQuery = useQuery(User.statusQueryOptions);
  createEffect(() => {
    if (statusQuery.isSuccess) {
      setProbablyLoggedIn(true);
    } else if (statusQuery.isError) {
      setProbablyLoggedIn(false);
    }
    if (!activeFacilityId() && statusQuery.data?.user.lastLoginFacilityId) {
      setActiveFacilityId(statusQuery.data.user.lastLoginFacilityId);
    }
  });
  const isFirstLoading = createMemo((prev) => prev && statusQuery.isLoading, true);
  return (
    <Show when={isFirstLoading()}>
      <MemoLoader />
    </Show>
  );
};
