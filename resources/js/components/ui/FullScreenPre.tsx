import {ParentComponent, createSignal, onMount, splitProps} from "solid-js";
import {cx, htmlAttributes} from "../utils";
import {useEventListener} from "../utils/event_listener";

export const FullScreenPre: ParentComponent<htmlAttributes.div> = (allProps) => {
  const [childrenProps, divProps] = splitProps(allProps, ["children"]);
  const [wrap, setWrap] = createSignal(true);
  useEventListener(document, "keypress", (e) => {
    if (e.key === "w") {
      setWrap(!wrap());
    }
  });
  let pre: HTMLPreElement | undefined;
  const [wrapInfoOpacity, setWrapInfoOpacity] = createSignal<number>();
  onMount(() => {
    if (pre!.clientWidth >= pre!.parentElement!.clientWidth) {
      setWrapInfoOpacity(1);
      setTimeout(() => setWrapInfoOpacity(0), 2000);
    }
  });
  return (
    <div class="absolute inset-0 flex overflow-auto">
      <div {...htmlAttributes.merge(divProps, {class: "grow"})}>
        <pre ref={pre} class={cx("inline-block p-2 bg-inherit", {wrapTextAnywhere: wrap()})}>
          {childrenProps.children}
        </pre>
      </div>
      <div
        class="fixed top-2 right-4 text-sm bg-white border border-gray-500 text-gray-500 rounded-lg p-2 opacity-0"
        style={{transition: "opacity 2s", opacity: wrapInfoOpacity()}}
      >
        Press W to toggle text wrapping
      </div>
    </div>
  );
};
