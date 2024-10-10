import {createSignal, onCleanup, onMount} from "solid-js";

export function useIsMounted() {
  const [mounted, setMounted] = createSignal(false);
  onMount(() => {
    setMounted(true);
    onCleanup(() => setMounted(false));
  });
  return mounted;
}
