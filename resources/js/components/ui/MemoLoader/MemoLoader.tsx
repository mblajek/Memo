import {cx, debouncedAccessor} from "components/utils";
import {Show, VoidComponent, createSignal, onCleanup, onMount} from "solid-js";
import {Portal} from "solid-js/web";
import MemoIcon from "./memo_icon.svg";

const [loaderCount, setLoaderCount] = createSignal(0);

/**
 * Full screen application loader, with a pulsating Memo logo.
 *
 * The logo is actually displayed in the portal in the LoaderInPortal component whenever there
 * is at least one MemoLoader element rendered.
 */
export const MemoLoader: VoidComponent = () => {
  onMount(() => setLoaderCount((v) => v + 1));
  onCleanup(() => setLoaderCount((v) => v - 1));
  return <></>;
};

/**
 * The full-screen pulsating loader. It is initially invisble, and becomes visible only when
 * there is at least one MemoLoader element rendered.
 */
export const LoaderInPortal: VoidComponent = () => {
  const isVisible = () => !!loaderCount();
  // Destroy the loader element completely a moment after disappearing.
  const exists = debouncedAccessor(isVisible, {timeMs: 1000, outputImmediately: (v) => v});
  return (
    <Show when={exists()}>
      <Portal>
        <div
          class={cx("fixed inset-0 z-fullScreenLoader bg-white flex justify-center items-center", {
            "opacity-0": !isVisible(),
            // Pass through pointer events when not visible or fading.
            "pointer-events-none": !isVisible(),
          })}
          style={{transition: "opacity 300ms ease"}}
        >
          <div class="animate-pulse">
            <MemoIcon height={300} />
          </div>
        </div>
      </Portal>
    </Show>
  );
};
