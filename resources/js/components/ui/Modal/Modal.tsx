import * as dialog from "@zag-js/dialog";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx} from "components/utils";
import {VsClose} from "solid-icons/vs";
import {ParentProps, Show, createMemo, createRenderEffect, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import s from "./Modal.module.scss";

interface BaseProps {
  title?: string;
  /** Width of the modal. If not specified, it adjusts to contents, with a reasonable minimum. */
  width?: "narrow";
  /**
   * Whether the modal is opened.
   *
   * The only way to close the modal is to set this to false, the modal never closes itself.
   */
  open: boolean;
  /**
   * Handler called when the user tries to escape from the modal, either by pressing the Escape key,
   * or by clicking outside. If these actions should close the modal, this handler needs to set the
   * open prop to false.
   */
  onEscape?: (reason: EscapeReason) => void;
}

const ESCAPE_REASONS = ["escapeKey", "clickOutside"] as const;

type EscapeReason = (typeof ESCAPE_REASONS)[number];

/**
 * Props of a modal without close reasons specified. It can close itself by any of the escape reasons,
 * but doesn't have a close button.
 */
interface PropsNoCloseReason extends BaseProps {
  closeOn?: undefined;
  onClose?: undefined;
}

/** Props of a modal that specifies some close reasons. */
interface PropsWithCloseReason<C extends CloseReason = CloseReason> extends BaseProps {
  /**
   * The list of reasons that cause the modal to close.
   *
   * If `"closeButton"` is specified, the modal has a close button (x in a corner).
   *
   * If the Esc or click outside is specified as a reason, it is still passed to onEscape,
   * but the same reason is also passed to onClose, so either of these two handlers can close
   * the modal.
   */
  closeOn: C | C[];
  /**
   * Handler called when any of the close reasons (specified in closeOn) occurs. The handler
   * should typically set the open prop to false to actually close the modal.
   */
  onClose: (reason: CloseReason) => void;
}

type CloseReason = EscapeReason | "closeButton";

function isEscapeReason(reason: CloseReason): reason is EscapeReason {
  return (ESCAPE_REASONS as readonly CloseReason[]).includes(reason);
}

type Props<C extends CloseReason> = PropsNoCloseReason | PropsWithCloseReason<C>;

export const Modal = <C extends CloseReason>(props: ParentProps<Props<C>>) => {
  const closeOn = createMemo(
    () =>
      new Set<CloseReason>(
        props.closeOn ? (typeof props.closeOn === "string" ? [props.closeOn] : props.closeOn) : undefined,
      ),
  );
  function tryClose(reason: CloseReason) {
    if (props.onEscape && isEscapeReason(reason)) {
      props.onEscape(reason);
    }
    if (closeOn().has(reason)) {
      props.onClose?.(reason);
    }
  }
  const [state, send] = useMachine(
    dialog.machine({
      closeOnOutsideClick: false,
      closeOnEsc: false,
      onEsc: () => tryClose("escapeKey"),
      onOutsideClick: () => tryClose("clickOutside"),
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
                <Show when={closeOn().has("closeButton")}>
                  <button class={s.closeButton} aria-label="Close" onClick={() => props.onClose?.("closeButton")}>
                    <VsClose class="w-6 h-6" />
                  </button>
                </Show>
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
