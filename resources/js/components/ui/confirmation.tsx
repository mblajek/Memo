import {Accessor, JSX, createSignal} from "solid-js";
import {cx, useLangFunc} from "../utils";
import {registerGlobalPageElement} from "../utils/GlobalPageElements";
import {focusThis} from "../utils/focus_this";
import {Button} from "./Button";
import {MODAL_STYLE_PRESETS, Modal} from "./Modal";
import {title} from "./title";

type _Directives = typeof title;

export interface ConfirmParams {
  readonly title: string;
  readonly body?: JSX.Element | Accessor<JSX.Element>;
  readonly confirmText?: JSX.Element | Accessor<JSX.Element>;
  readonly cancelText?: JSX.Element | Accessor<JSX.Element>;
  readonly mode?: ConfirmationMode;
  readonly confirmDisabled?: Accessor<boolean>;
  readonly modalStyle?: JSX.CSSProperties;
}

/**
 * How much confirming should be encouraged:
 *  - default - the confirm button has primary class.
 *  - warning - the operation is somewhat more risky, the confirm button's style is the same as that of cancel.
 *  - danger - the operation is dangerous and the user needs to focus more to confirm.
 */
type ConfirmationMode = "default" | "warning" | "danger";

interface ConfirmData extends ConfirmParams {
  readonly resolve: (confirmed: boolean | undefined) => void;
}

const READ_BEFORE_CONFIRM_MILLIS = 5000;

const createConfirmationInternal = registerGlobalPageElement<ConfirmData>((args) => {
  const t = useLangFunc();
  function jsx(element: JSX.Element | Accessor<JSX.Element> | undefined, defaultValue?: JSX.Element) {
    return element === undefined ? defaultValue : typeof element === "function" ? element() : element;
  }
  return (
    <Modal
      title={args.params()?.title}
      open={args.params()}
      style={{...MODAL_STYLE_PRESETS.narrow, ...args.params()?.modalStyle}}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => {
        args.params()?.resolve(undefined);
        args.clearParams();
      }}
    >
      {(data) => {
        const [readBeforeConfirm, setReadBeforeConfirm] = createSignal(data().mode === "danger");
        setTimeout(() => setReadBeforeConfirm(false), READ_BEFORE_CONFIRM_MILLIS);
        const body = () => jsx(data().body);
        return (
          <div class="flex flex-col gap-1 items-stretch">
            <div>{body()}</div>
            <div class="flex gap-1 justify-center items-stretch">
              <Button
                class="flex-grow basis-0 secondary"
                onClick={() => {
                  data().resolve(false);
                  args.clearParams();
                }}
              >
                {jsx(data().cancelText, t("actions.cancel"))}
              </Button>
              <Button
                ref={(el) => focusThis(el)}
                class={cx("flex-grow basis-0", (data().mode || "default") === "default" ? "primary" : "secondary")}
                title={[
                  data().mode === "danger" ? t("confirmation.read_before_confirm") : undefined,
                  {placement: "bottom"},
                ]}
                onClick={() => {
                  data().resolve(true);
                  args.clearParams();
                }}
                disabled={data().confirmDisabled?.() || readBeforeConfirm()}
              >
                {jsx(data().confirmText, t("actions.confirm"))}
              </Button>
            </div>
          </div>
        );
      }}
    </Modal>
  );
});

export function createConfirmation() {
  const {show, getValue} = createConfirmationInternal();
  return {
    confirm: (params: ConfirmParams | string) =>
      new Promise<boolean | undefined>((resolve) =>
        show({...(typeof params === "string" ? {title: params} : params), resolve}),
      ),
    isShown: () => getValue() !== undefined,
  };
}
