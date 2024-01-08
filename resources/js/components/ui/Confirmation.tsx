import {JSX, VoidComponent, createSignal} from "solid-js";
import {useLangFunc} from "../utils";
import {Button} from "./Button";
import {Modal} from "./Modal";

interface ConfirmParams {
  title: string;
  body?: JSX.Element;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmData extends ConfirmParams {
  resolve: (confirmed: boolean | undefined) => void;
}

const [data, setData] = createSignal<ConfirmData>();

export const Confirmation: VoidComponent = () => {
  const t = useLangFunc();
  return (
    <Modal
      title={data()?.title}
      open={data()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => {
        data()?.resolve(undefined);
        setData(undefined);
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
                setData(undefined);
              }}
            >
              {data().cancelText || t("actions.cancel")}
            </Button>
            <Button
              class="flex-grow basis-0 primary"
              onClick={() => {
                data().resolve(true);
                setData(undefined);
              }}
            >
              {data().confirmText || t("actions.confirm")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

/**
 * Shows a confirmation dialog and returns a promise resolving to true if confirmed, false if cancelled
 * and undefined if closed without clicking a button.
 */
export function confirm(params: ConfirmParams | string) {
  return new Promise<boolean | undefined>((resolve) =>
    setData({...(typeof params === "string" ? {title: params} : params), resolve}),
  );
}
