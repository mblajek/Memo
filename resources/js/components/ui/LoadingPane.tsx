import {Show, VoidComponent} from "solid-js";
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
    <Show when={props.isLoading ?? true}>
      <div class="absolute inset-0 z-50 flex items-center justify-center bg-white opacity-70 pointer-events-none">
        <BigSpinner />
      </div>
    </Show>
  );
};
