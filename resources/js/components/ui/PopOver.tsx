import * as popover from "@zag-js/popover";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {htmlAttributes} from "components/utils";
import {Accessor, Component, JSX, Show, createMemo, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import s from "./PopOver.module.scss";
import {ChildrenOrFunc, getChildrenElement} from "./children_func";

interface Props {
  readonly trigger: (triggerProps: Accessor<htmlAttributes.button>) => JSX.Element;
  readonly children: ChildrenOrFunc<[Accessor<popover.Api>]>;
}

export const PopOver: Component<Props> = (props) => {
  const [state, send, machine] = useMachine(
    popover.machine({
      portalled: true,
      positioning: {
        gutter: 1,
        strategy: "absolute",
        placement: "bottom-end",
        overflowPadding: 0,
      },
      id: createUniqueId(),
    }),
  );
  const api = createMemo(() => popover.connect(state, send, normalizeProps));
  /**
   * A wrapper of the api for the children function. It ignores the close() call if the machine is not running.
   * This might happen if the element no longer exists at this point.
   */
  const apiWrapper = createMemo(() => {
    const theApi = api();
    return {
      ...theApi,
      close: () => {
        if (machine.status === "Running") {
          theApi.close();
        }
      },
    };
  });
  return (
    <>
      {props.trigger(() => api().triggerProps)}
      <Portal>
        <div class={s.popOverPortal}>
          <div {...api().positionerProps}>
            <div {...api().contentProps}>
              <Show when={api().isOpen}>{getChildrenElement(props.children, apiWrapper)}</Show>
            </div>
          </div>
        </div>
      </Portal>
    </>
  );
};
