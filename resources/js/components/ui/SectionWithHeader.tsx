import {Accessor, JSX, ParentComponent, Show, createSignal, onCleanup, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";

interface Props extends htmlAttributes.div {
  readonly header?: (show: Accessor<boolean>) => JSX.Element;
  readonly footer?: (show: Accessor<boolean>) => JSX.Element;
}

/**
 * A section with a header and/or footer. The header/footer is displayed only if the section is
 * actually present, i.e. has non-zero height.
 */
export const SectionWithHeader: ParentComponent<Props> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["header", "footer", "children"]);
  const [isPresent, setIsPresent] = createSignal<boolean>();
  const obs = new ResizeObserver((entries) => setIsPresent(entries.at(-1)!.contentBoxSize.some((b) => b.blockSize)));
  onCleanup(() => obs.disconnect());
  return (
    <>
      <Show when={isPresent() !== undefined}>{props.header?.(isPresent as Accessor<boolean>)}</Show>
      <div ref={(div) => obs.observe(div)} {...divProps}>
        {props.children}
      </div>
      <Show when={isPresent() !== undefined}>{props.footer?.(isPresent as Accessor<boolean>)}</Show>
    </>
  );
};
