import {A} from "@solidjs/router";
import {InfoIcon} from "components/ui/InfoIcon";
import {useLangFunc} from "components/utils/lang";
import {TbInfoTriangle} from "solid-icons/tb";
import {VoidComponent} from "solid-js";

export default (() => {
  const t = useLangFunc();
  return (
    <div class="mx-2 my-6 flex flex-col gap-4 items-center">
      <div class="text-xl">{t("reports.select_report_from_menu")}</div>
      <A href="/help/reports">
        {t("reports.more_info")} <InfoIcon title="" />
      </A>
    </div>
  );
}) satisfies VoidComponent;
