import {QueryCache, QueryClient, QueryClientProvider, createQuery} from "@tanstack/solid-query";
import {isAxiosError} from "axios";
import {MemoLoader} from "components/ui";
import {System} from "data-access/memo-api";
import {Api} from "data-access/memo-api/types";
import {ParentComponent, createMemo} from "solid-js";
import toast from "solid-toast";
import {useLangFunc} from ".";
import {QueryBarrier} from "./QueryBarrier";

/**
 * Tanstack/solid-query initialization component
 *
 * Handles custom queryClient and queryCache initialization
 */
export const InitializeTanstackQuery: ParentComponent = (props) => {
  const t = useLangFunc();
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
            if (isAxiosError<Api.ErrorResponse>(error)) {
              if ((error?.status && error.status >= 500) || !query.meta?.quietError) {
                error.response?.data.errors.forEach((memoError) => {
                  toast.error(
                    t(memoError.code, {
                      ...(Api.isValidationError(memoError) ? {attribute: memoError.field} : undefined),
                      ...memoError.data,
                    }),
                  );
                });
              }
            }
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
