import {Accessor, Component, JSX, createMemo, createSignal, on, onCleanup, onMount, splitProps} from "solid-js";
import {htmlAttributes} from "./html_attributes";

/** Returns a signal tracking whether the element is placed in a disabled fieldset. */
export function useIsFieldsetDisabled(element: Accessor<HTMLElement | undefined>): Accessor<boolean | undefined> {
  const isDisabledFunc = createMemo(
    on(element, (element) => {
      const [disabledFunc, setDisabledFunc] = createSignal<Accessor<boolean | undefined>>();
      onMount(() => {
        const fieldsetsDisabled: Accessor<boolean>[] = [];
        let el: HTMLElement | undefined | null = element;
        while (el) {
          const fieldset: HTMLFieldSetElement | null = el.closest("fieldset");
          el = fieldset?.parentElement;
          if (fieldset) {
            const [disabled, setDisabled] = createSignal(fieldset.disabled);
            const observer = new MutationObserver(() => setDisabled(fieldset.disabled));
            observer.observe(fieldset, {attributes: true, attributeFilter: ["disabled"]});
            onCleanup(() => observer.disconnect());
            // eslint-disable-next-line solid/reactivity
            fieldsetsDisabled.push(disabled);
          }
        }
        setDisabledFunc(
          () => () => (fieldsetsDisabled.length ? fieldsetsDisabled.some((disabled) => disabled()) : undefined),
        );
      });
      return disabledFunc;
    }),
  );
  const isDisabled = createMemo(() => isDisabledFunc()()?.());
  return isDisabled;
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
