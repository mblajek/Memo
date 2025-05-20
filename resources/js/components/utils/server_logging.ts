import {useMutation, useQuery} from "@tanstack/solid-query";
import {System} from "data-access/memo-api/groups/System";
import {User} from "data-access/memo-api/groups/User";

export function useServerLog(options?: Omit<Parameters<typeof useQuery>[0], "mutationFn">) {
  const userStatus = useQuery(User.statusQueryOptions);
  const logMutation = useMutation(() => ({...options, mutationFn: System.log}));
  const logFunc = (request: System.LogRequest, options?: Parameters<typeof logMutation.mutate>[1]) => {
    console.info("Logging to server:", request);
    // Optimistically try to log if it isn't a clear error.
    if (!userStatus.isError) {
      logMutation.mutate(request, options);
    }
  };
  logFunc.mutation = logMutation;
  return logFunc;
}
