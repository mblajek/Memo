import {Accessor, JSX, ParentComponent, Show, createSignal, splitProps} from "solid-js";
import {htmlAttributes} from "../utils";
import {observeResizeTarget} from "../utils/size_observers";

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
  const [div, setDiv] = createSignal<HTMLDivElement>();
  // eslint-disable-next-line solid/reactivity
  const isPresent = observeResizeTarget(div, (div) => div.clientHeight > 0);
  return (
    <>
      <Show when={isPresent() !== undefined}>{props.header?.(isPresent as Accessor<boolean>)}</Show>
      <div ref={setDiv} {...divProps}>
        {props.children}
      </div>
      <Show when={isPresent() !== undefined}>{props.footer?.(isPresent as Accessor<boolean>)}</Show>
    </>
  );
};
