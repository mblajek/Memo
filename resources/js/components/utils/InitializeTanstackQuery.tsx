import {QueryCache, QueryClient, QueryClientProvider, createQuery} from "@tanstack/solid-query";
import {isAxiosError} from "axios";
import {MemoLoader} from "components/ui";
import {System} from "data-access/memo-api";
import {Api} from "data-access/memo-api/types";
import {ParentComponent, createMemo} from "solid-js";
import toast from "solid-toast";
import {QueryBarrier} from "./QueryBarrier";
import {getLangFunc} from ".";

/**
 * Tanstack/solid-query initialization component
 *
 * Handles custom queryClient and queryCache initialization
 */
export const InitializeTanstackQuery: ParentComponent = (props) => {
  const t = getLangFunc();
  const queryClient = createMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnReconnect: true,
            refetchOnMount: false,
            refetchOnWindowFocus: false,
            retry: false,
          },
        },
        queryCache: new QueryCache({
          onError(error, query) {
            console.log(query.meta?.quietError);
            if (isAxiosError<Api.ErrorResponse>(error)) {
              error.response?.data.errors.forEach((memoError) => {
                if (
                  (error?.status && error.status >= 500) ||
                  !query.meta?.quietError
                )
                  toast.error(t(memoError.code));
              });
            }
          },
        }),
      })
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
  const facilitiesQuery = createQuery(() => System.facilitiesQueryOptions);

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
