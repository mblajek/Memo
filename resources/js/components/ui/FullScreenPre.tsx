import {ParentComponent, createSignal, onCleanup, onMount, splitProps} from "solid-js";
import {cx, htmlAttributes} from "../utils";

export const FullScreenPre: ParentComponent<htmlAttributes.div> = (allProps) => {
  const [childrenProps, divProps] = splitProps(allProps, ["children"]);
  const [wrap, setWrap] = createSignal(true);
  const documentKeyPressListener = (e: KeyboardEvent) => {
    if (e.key === "w") {
      setWrap(!wrap());
    }
  };
  onMount(() => document.addEventListener("keypress", documentKeyPressListener));
  onCleanup(() => document.removeEventListener("keypress", documentKeyPressListener));
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
