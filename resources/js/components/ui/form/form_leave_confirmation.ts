import {useLangFunc} from "components/utils";
import {createConfirmation} from "../confirmation";

export function createFormLeaveConfirmation() {
  const t = useLangFunc();
  const confirmation = createConfirmation();
  return {
    confirm: async () =>
      !confirmation.isShown() &&
      (await confirmation.confirm({
        title: t("form_page_leave_confirmation.title"),
        body: t("form_page_leave_confirmation.body"),
        cancelText: t("form_page_leave_confirmation.cancel"),
        confirmText: t("form_page_leave_confirmation.confirm"),
        mode: "warning",
      })),
  };
}
