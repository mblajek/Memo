import {cx, htmlAttributes} from "components/utils";
import {useEventListener} from "components/utils/event_listener";
import {createSignal, VoidComponent} from "solid-js";

interface Props extends htmlAttributes.div {
  readonly scrollableUp: boolean;
}

export const ScrollableUpMarker: VoidComponent<Props> = (props) => {
  return (
    <div {...htmlAttributes.merge(props, {class: "h-0"})}>
      <div
        class={cx("h-4 transition-opacity pointer-events-none", props.scrollableUp ? "opacity-30" : "opacity-0")}
        style={{background: "radial-gradient(70% 100% ellipse at top, black, transparent)"}}
      />
    </div>
  );
};

export function createScrollableUpMarker() {
  const [scrollableUp, setScrollableUp] = createSignal(false);
  const ScrollableUpMarkerInternal: VoidComponent<htmlAttributes.div> = (props) => (
    <ScrollableUpMarker {...props} scrollableUp={scrollableUp()} />
  );
  function scrollableRef(ref: HTMLElement) {
    useEventListener(ref, "scroll", () => setScrollableUp(ref.scrollTop > 1));
  }
  return {
    ScrollableUpMarker: ScrollableUpMarkerInternal,
    scrollableRef,
    scrollableUp,
  };
}
