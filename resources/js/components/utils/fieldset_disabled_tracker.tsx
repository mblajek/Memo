import {Accessor, Component, JSX, createEffect, createMemo, createSignal, on, onCleanup, splitProps} from "solid-js";
import {htmlAttributes} from "./html_attributes";

/** Returns a signal tracking whether the element is placed in a disabled fieldset. */
export function useIsFieldsetDisabled(element: Accessor<HTMLElement | undefined>): Accessor<boolean | undefined> {
  const [disabled, setDisabled] = createSignal<boolean | undefined>();
  createEffect(
    on(element, (element) => {
      if (element) {
        const fieldset = element.closest("fieldset");
        if (fieldset) {
          setDisabled(fieldset.disabled);
          const obs = new MutationObserver(() => setDisabled(fieldset.disabled));
          obs.observe(fieldset, {attributes: true, attributeFilter: ["disabled"]});
          onCleanup(() => obs.disconnect());
        } else {
          setDisabled(undefined);
        }
      } else {
        setDisabled(undefined);
      }
    }),
  );
  return disabled;
}

interface FieldsetDisabledTrackerProps extends Omit<htmlAttributes.div, "children"> {
  readonly children: (accessor: Accessor<boolean | undefined>) => JSX.Element;
}

export const FieldsetDisabledTracker: Component<FieldsetDisabledTrackerProps> = (allProps) => {
  const [props, divProps] = splitProps(allProps, ["children"]);
  const [element, setElement] = createSignal<HTMLElement | undefined>();
  const isFieldsetDisabled = useIsFieldsetDisabled(element);
  const ch = createMemo(
    on(
      () => props.children,
      (children) => children(isFieldsetDisabled),
    ),
  );
  return (
    <div ref={setElement} {...divProps}>
      {ch()}
    </div>
  );
};
