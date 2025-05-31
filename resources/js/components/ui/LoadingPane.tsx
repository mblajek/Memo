import {cx} from "components/utils/classnames";
import {delayedAccessor} from "components/utils/debounce";
import {VoidComponent} from "solid-js";
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
  const shown = delayedAccessor(() => props.isLoading, {
    timeMs: 1000,
    outputImmediately: (isLoading) => !!isLoading,
  });
  return (
    <div
      class={cx(
        "absolute inset-0 z-50 flex items-center justify-center bg-white pointer-events-none",
        props.isLoading ? "opacity-70" : "opacity-0",
        shown() ? undefined : "hidden",
      )}
      style={{transition: "opacity 0.4s"}}
    >
      <BigSpinner />
    </div>
  );
};

export const MutationTrackingLoadingPane: VoidComponent = () => {
  const mutationsTracker = useMutationsTracker();
  return <LoadingPane isLoading={mutationsTracker.isAnyPending()} />;
};
