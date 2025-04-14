import {cx} from "components/utils/classnames";
import {useLangFunc} from "components/utils/lang";
import {Accessor, JSX, createSignal} from "solid-js";
import {registerGlobalPageElement} from "../utils/GlobalPageElements";
import {focusThis} from "../utils/focus_this";
import {Button} from "./Button";
import {MODAL_STYLE_PRESETS, Modal} from "./Modal";
import {title} from "./title";

type _Directives = typeof title;

export interface ConfirmParams {
  readonly title?: JSX.Element;
  readonly body?: JSX.Element | ((controller: ConfirmationController) => JSX.Element);
  readonly confirmText?: JSX.Element | Accessor<JSX.Element>;
  readonly cancelText?: JSX.Element | Accessor<JSX.Element>;
  readonly mode?: ConfirmationMode;
  readonly confirmDisabled?: Accessor<boolean>;
  readonly modalStyle?: JSX.CSSProperties;
}

interface ConfirmationController {
  readonly resolve: (confirmed: boolean | undefined) => void;
}

/**
 * How much confirming should be encouraged:
 *  - default - the confirm button has primary class.
 *  - warning - the operation is somewhat more risky, the confirm button's style is the same as that of cancel.
 *  - danger - the operation is dangerous and the user needs to focus more to confirm.
 */
type ConfirmationMode = "default" | "warning" | "danger";

interface ConfirmData extends ConfirmParams, ConfirmationController {}

const READ_BEFORE_CONFIRM_MILLIS = 5000;

const createConfirmationInternal = registerGlobalPageElement<ConfirmData>((args) => {
  const t = useLangFunc();
  function resolveOuter(confirmed: boolean | undefined) {
    args.params()?.resolve(confirmed);
    args.clearParams();
  }
  return (
    <Modal
      title={args.params()?.title}
      open={args.params()}
      style={{...MODAL_STYLE_PRESETS.narrow, ...args.params()?.modalStyle}}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => resolveOuter(undefined)}
    >
      {(data) => {
        const [readBeforeConfirm, setReadBeforeConfirm] = createSignal(data().mode === "danger");
        const disabled = () => data().confirmDisabled?.() || readBeforeConfirm();
        function resolve(confirmed: boolean | undefined) {
          if (confirmed && disabled()) {
            return;
          }
          resolveOuter(confirmed);
        }
        setTimeout(() => setReadBeforeConfirm(false), READ_BEFORE_CONFIRM_MILLIS);
        const body = () => jsx({element: data().body, params: [{resolve}]});
        return (
          <div class="flex flex-col gap-1 items-stretch">
            <div>{body()}</div>
            <div class="flex gap-1 justify-center items-stretch">
              <Button class="flex-grow basis-0 secondary" onClick={[resolve, false]}>
                {jsx({element: data().cancelText, defaultValue: t("actions.cancel")})}
              </Button>
              <Button
                ref={(el) => focusThis(el)}
                class={cx("flex-grow basis-0", (data().mode || "default") === "default" ? "primary" : "secondary")}
                title={[
                  data().mode === "danger" ? t("confirmation.read_before_confirm") : undefined,
                  {placement: "bottom"},
                ]}
                onClick={[resolve, true]}
                disabled={disabled()}
              >
                {jsx({element: data().confirmText, defaultValue: t("actions.confirm")})}
              </Button>
            </div>
          </div>
        );
      }}
    </Modal>
  );
});

function jsx<P extends unknown[]>(args: {
  element: JSX.Element | ((...params: P) => JSX.Element) | undefined;
  params: P;
  defaultValue?: JSX.Element;
}): JSX.Element | undefined;
function jsx(args: {element: JSX.Element | (() => JSX.Element) | undefined; defaultValue?: JSX.Element}): JSX.Element;
function jsx<P extends unknown[]>({
  element,
  params = [] as unknown as P,
  defaultValue,
}: {
  element: JSX.Element | ((...params: P) => JSX.Element) | undefined;
  params?: P;
  defaultValue?: JSX.Element;
}) {
  return element === undefined ? defaultValue : typeof element === "function" ? element(...params) : element;
}

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
