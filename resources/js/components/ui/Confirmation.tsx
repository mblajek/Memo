import {Component, JSX, createSignal} from "solid-js";
import {useLangFunc} from "../utils";
import {Modal} from "./Modal";

interface ConfirmParams {
  title: string;
  body?: JSX.Element;
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmData extends ConfirmParams {
  confirm: () => void;
  reject: (reason: "reject" | "close") => void;
}

const [data, setData] = createSignal<ConfirmData>();

export const Confirmation: Component = () => {
  const t = useLangFunc();
  return (
    <Modal
      title={data()?.title}
      open={data()}
      closeOn={["escapeKey", "closeButton"]}
      onClose={() => {
        data()?.reject("close");
        setData(undefined);
      }}
    >
      {(data) => (
        <div class="flex flex-col gap-1 items-stretch">
          {data().body}
          <div class="flex gap-1 justify-center">
            <button
              class="flex-grow basis-0 border border-cyan-500 p-2 text-cyan-500"
              onClick={() => {
                data().reject("reject");
                setData(undefined);
              }}
            >
              {data().cancelText || t("cancel")}
            </button>
            <button
              class="flex-grow basis-0 bg-cyan-500 p-2 text-white"
              onClick={() => {
                data().confirm();
                setData(undefined);
              }}
            >
              {data().confirmText || t("confirm")}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export function confirm(params: ConfirmParams | string) {
  return new Promise<void>((confirm, reject) =>
    setData({
      ...(typeof params === "string" ? {title: params} : params),
      confirm,
      reject,
    }),
  );
}