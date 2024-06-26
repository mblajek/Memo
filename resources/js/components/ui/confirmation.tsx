import {JSX} from "solid-js";
import {cx, useLangFunc} from "../utils";
import {registerGlobalPageElement} from "../utils/GlobalPageElements";
import {focusThis} from "../utils/focus_this";
import {Button} from "./Button";
import {Modal} from "./Modal";

interface ConfirmParams {
  readonly title: string;
  readonly body?: JSX.Element;
  readonly confirmText?: string;
  readonly cancelText?: string;
  /** Whether the confirm button is primary. Default: true. */
  readonly confirmPrimary?: boolean;
}

interface ConfirmData extends ConfirmParams {
  readonly resolve: (confirmed: boolean | undefined) => void;
}

const createConfirmationInternal = registerGlobalPageElement<ConfirmData>((args) => {
  const t = useLangFunc();
  return (
    <Modal
      title={args.params()?.title}
      open={args.params()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => {
        args.params()?.resolve(undefined);
        args.clearParams();
      }}
    >
      {(data) => (
        <div class="flex flex-col gap-1 items-stretch">
          {data().body}
          <div class="flex gap-1 justify-center items-stretch">
            <Button
              class="flex-grow basis-0 secondary"
              onClick={() => {
                data().resolve(false);
                args.clearParams();
              }}
            >
              {data().cancelText || t("actions.cancel")}
            </Button>
            <Button
              ref={(el) => focusThis(el)}
              class={cx("flex-grow basis-0", data().confirmPrimary ?? true ? "primary" : "secondary")}
              onClick={() => {
                data().resolve(true);
                args.clearParams();
              }}
            >
              {data().confirmText || t("actions.confirm")}
            </Button>
          </div>
        </div>
      )}
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
