import * as dialog from "@zag-js/dialog";
import {normalizeProps, useMachine} from "@zag-js/solid";
import {cx, useLangFunc} from "components/utils";
import {VsClose} from "solid-icons/vs";
import {Accessor, JSX, Show, createMemo, createRenderEffect, createUniqueId} from "solid-js";
import {Portal} from "solid-js/web";
import {ChildrenOrFunc, getChildrenElement} from "../children_func";
import s from "./Modal.module.scss";

interface BaseProps<T> {
  title?: string;
  /**
   * Style of the modal, mostly for specifying the size. When absent, a reasonable minimum width is used.
   */
  style?: JSX.CSSProperties;
  /**
   * A value determining whether the modal is open. If truthy, the value is also available for the modal
   * children in its function form.
   *
   * The only way to close the modal is to set this to a falsy value (the modal never closes itself).
   */
  open: T | undefined | false;
  /**
   * Children can be either a standard JSX element, or a function that is called with an accessor
   * to the non-nullable value passed to open. This is similar to the function form of the Show component.
   * see Modal doc for example.
   */
  children: ChildrenOrFunc<[Accessor<NonNullable<T>>]>;
  /**
   * Handler called when the user tries to escape from the modal, either by pressing the Escape key,
   * or by clicking outside. If these actions should close the modal, this handler needs to set the
   * open prop to false.
   */
  onEscape?: (reason: EscapeReason) => void;
}

export const MODAL_STYLE_PRESETS = {
  narrow: {width: "400px"},
} satisfies Partial<Record<string, JSX.CSSProperties>>;

const ESCAPE_REASONS = ["escapeKey", "clickOutside"] as const;

type EscapeReason = (typeof ESCAPE_REASONS)[number];

/**
 * Props of a modal without close reasons specified. It can close itself by any of the escape reasons,
 * but doesn't have a close button.
 */
interface PropsNoCloseReason<T> extends BaseProps<T> {
  closeOn?: undefined;
  onClose?: undefined;
}

/**
 * Props of a modal that specifies some close reasons.
 *
 * If close reasons are specified using closeOn prop, the onClose handler needs to be specified as well,
 * to actually handle the closing.
 */
interface PropsWithCloseReason<T, C extends CloseReason = CloseReason> extends BaseProps<T> {
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
  onClose: (reason: C) => void;
}

type CloseReason = EscapeReason | "closeButton";

function isEscapeReason(reason: CloseReason): reason is EscapeReason {
  return (ESCAPE_REASONS as readonly CloseReason[]).includes(reason);
}

type Props<T, C extends CloseReason> = PropsNoCloseReason<T> | PropsWithCloseReason<T, C>;

export const Modal = <T, C extends CloseReason>(props: Props<T, C>) => {
  const t = useLangFunc();
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
      props.onClose?.(reason as C);
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
  return (
    <Show when={props.open}>
      {(value) => (
        <Show when={api().isOpen}>
          <Portal>
            <div class={cx(s.modal, closeOn().has("closeButton") && s.withCloseButton)}>
              <div {...api().backdropProps} />
              <div {...api().containerProps}>
                <div {...api().contentProps} style={props.style}>
                  <div class={s.innerContent}>
                    <Show when={closeOn().has("closeButton")}>
                      <button
                        class={s.closeButton}
                        aria-label={t("close")}
                        onClick={() => props.onClose?.("closeButton" as C)}
                      >
                        <VsClose class="w-6 h-6" />
                      </button>
                    </Show>
                    <Show when={props.title}>
                      <h2 {...api().titleProps}>{props.title}</h2>
                    </Show>
                    <div class={s.body}>{getChildrenElement(props.children, value)}</div>
                  </div>
                </div>
              </div>
            </div>
          </Portal>
        </Show>
      )}
    </Show>
  );
};
