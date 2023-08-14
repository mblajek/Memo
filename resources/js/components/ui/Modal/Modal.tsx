import * as dialog from "@zag-js/dialog";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {ParentComponent, Show, createComputed, createMemo, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import s from "./Modal.module.scss";

interface Props {
  title?: string;
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
  createComputed(() => {
    if (props.open) {
      api().open();
    } else {
      api().close();
    }
  });
  return (
    <Show when={api().isOpen}>
      <Portal>
        <div class={s.modal}>
          <div {...api().backdropProps} />
          <div {...api().containerProps}>
            <div {...api().contentProps}>
              <Show when={props.title}>
                <h2 {...api().titleProps}>{props.title}</h2>
              </Show>
              {props.children}
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
};
