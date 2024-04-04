import {useLangFunc} from "components/utils";
import {TbInfoTriangle} from "solid-icons/tb";
import {VoidComponent} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <div class="mx-2 my-6 flex justify-center gap-1">
      <TbInfoTriangle size={20} class="text-memo-active" />
      {t("reports.select_report_from_menu")}
    </div>
  );
}) satisfies VoidComponent;
