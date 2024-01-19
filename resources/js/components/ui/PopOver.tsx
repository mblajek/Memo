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
  const [state, send] = useMachine(
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
  return (
    <>
      {props.trigger(() => api().triggerProps)}
      <Portal>
        <div class={s.popOverPortal}>
          <div {...api().positionerProps}>
            <div {...api().contentProps}>
              <Show when={api().isOpen}>{getChildrenElement(props.children, api)}</Show>
            </div>
          </div>
        </div>
      </Portal>
    </>
  );
};
