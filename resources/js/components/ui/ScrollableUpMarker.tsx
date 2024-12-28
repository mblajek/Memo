import {cx, htmlAttributes} from "components/utils";
import {VoidComponent} from "solid-js";

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
