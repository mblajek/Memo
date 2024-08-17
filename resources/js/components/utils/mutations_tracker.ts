import {useMutationState} from "@tanstack/solid-query";

export function useMutationsTracker() {
  const pendingMutations = useMutationState(() => ({filters: {status: "pending"}}));
  return {
    isAnyPending: () => pendingMutations().length > 0,
  };
}
