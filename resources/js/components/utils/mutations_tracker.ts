import {createSignal} from "solid-js";

const [mutationsCounts, setMutationsCount] = createSignal<ReadonlyMap<string, number>>(new Map<string, number>());

export function useMutationsTracker() {
  return {
    registerMutation(id: string) {
      setMutationsCount((prev) => new Map(prev).set(id, (prev.get(id) || 0) + 1));
      return () => setMutationsCount((prev) => new Map(prev).set(id, prev.get(id)! - 1));
    },
    isMutating(id: string) {
      return !!mutationsCounts().get(id);
    },
  };
}
