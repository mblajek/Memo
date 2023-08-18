import * as dialog from "@zag-js/dialog";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx} from "components/utils";
import {ParentComponent, Show, createMemo, createRenderEffect, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import s from "./Modal.module.scss";

interface Props {
  title?: string;
  /** Width of the modal. If not specified, it adjusts to contents, with a reasonable minimum. */
  width?: "narrow";
  open: boolean;
  /**
   * Event triggered when the Esc key is pressed or when the user clicks outside of the modal.
   * If specified, it can react to that event by closing the dialog (i.e. setting the open prop
   * to false).
   */
  onEscape?: (reason: "key" | "click") => void;
}

export const Modal: ParentComponent<Props> = (props) => {
  const [state, send] = useMachine(
    dialog.machine({
      closeOnOutsideClick: false,
      closeOnEsc: false,
      onEsc: () => props.onEscape?.("key"),
      onOutsideClick: () => props.onEscape?.("click"),
      id: createUniqueId(),
    }),
  );
  const api = createMemo(() => dialog.connect(state, send, normalizeProps));
  createRenderEffect(() => {
    if (props.open) {
      api().open();
    } else {
      api().close();
    }
  });
  const modalWidthClass = () => (props.width === "narrow" ? s.narrow : undefined);
  return (
    <Show when={api().isOpen}>
      <Portal>
        <div class={cx(s.modal, modalWidthClass())}>
          <div {...api().backdropProps} />
          <div {...api().containerProps}>
            <div {...api().contentProps}>
              <div class={s.innerContent}>
                <Show when={props.title}>
                  <h2 {...api().titleProps}>{props.title}</h2>
                </Show>
                <div>{props.children}</div>
              </div>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
