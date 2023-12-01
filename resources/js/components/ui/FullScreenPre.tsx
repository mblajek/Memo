import {ParentComponent, createSignal, splitProps} from "solid-js";
import {cx, htmlAttributes} from "../utils";

export const FullScreenPre: ParentComponent<htmlAttributes.div> = (allProps) => {
  const [childrenProps, divProps] = splitProps(allProps, ["children"]);
  const [wrap, setWrap] = createSignal(true);
  return (
    <div class="absolute inset-0 flex overflow-auto">
      <div
        {...htmlAttributes.merge(divProps, {class: "grow"})}
        tabindex="0"
        onKeyDown={(e) => {
          if (e.key === "w") {
            setWrap(!wrap());
          }
        }}
      >
        <pre class={cx("p-1 bg-inherit", {wrapTextAnywhere: wrap()})}>{childrenProps.children}</pre>
      </div>
    </div>
  );
};
