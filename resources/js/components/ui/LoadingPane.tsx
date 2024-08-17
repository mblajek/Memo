import {Show, VoidComponent} from "solid-js";
import {cx, debouncedAccessor} from "../utils";
import {useMutationsTracker} from "../utils/mutations_tracker";
import {BigSpinner} from "./Spinner";

interface LoadingPaneProps {
  readonly isLoading?: boolean;
}

/**
 * A loading pane displayed on top of a relative-positioned component while it is loading.
 * It does not block pointer events.
 */
export const LoadingPane: VoidComponent<LoadingPaneProps> = (props) => {
  // eslint-disable-next-line solid/reactivity
  const shown = debouncedAccessor(() => props.isLoading, {timeMs: 1000, outputImmediately: (isLoading) => !!isLoading});
  return (
    <div
      class={cx(
        "absolute inset-0 z-50 flex items-center justify-center bg-white pointer-events-none",
        props.isLoading ? "opacity-70" : "opacity-0",
      )}
      style={{transition: "opacity 0.4s"}}
    >
      <Show when={shown()}>
        <BigSpinner />
      </Show>
    </div>
  );
};

interface MutationTrackingLoadingPaneProps {
  readonly id: string;
}

export const MutationTrackingLoadingPane: VoidComponent<MutationTrackingLoadingPaneProps> = (props) => {
  const mutationsTracker = useMutationsTracker();
  return <LoadingPane isLoading={mutationsTracker.isMutating(props.id)} />;
};
