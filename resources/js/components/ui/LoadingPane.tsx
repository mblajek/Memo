import {VoidComponent} from "solid-js";
import {cx} from "../utils";
import {BigSpinner} from "./Spinner";

interface Props {
  readonly isLoading?: boolean;
}

/**
 * A loading pane displayed on top of a relative-positioned component while it is loading.
 * It does not block pointer events.
 */
export const LoadingPane: VoidComponent<Props> = (props) => {
  return (
    <div
      class={cx("absolute inset-0 z-50 flex items-center justify-center bg-white pointer-events-none opacity-0", {
        "opacity-70": props.isLoading,
      })}
      style={{transition: "opacity 0.4s"}}
    >
      <BigSpinner />
    </div>
  );
};
