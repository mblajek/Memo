import {A} from "@solidjs/router";
import {Capitalize} from "components/ui/Capitalize";
import {InfoIcon} from "components/ui/InfoIcon";
import {isDEV} from "components/utils/dev_mode";
import {useLangFunc} from "components/utils/lang";
import {OcTable3} from "solid-icons/oc";
import {For, VoidComponent} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

export default (() => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const reports = () => [
    {path: "meetings", label: t("routes.facility.meetings")},
    {path: "meeting-attendants", label: t("routes.facility.meeting_attendants")},
    {path: "meeting-clients", label: t("routes.facility.meeting_clients")},
    ...(isDEV() ? [{path: "system-meetings", label: "DEV System"}] : []),
  ];
  return (
    <div class="mx-2 my-6 flex flex-col gap-4">
      <div class="text-xl font-bold">{t("reports.pick_report")}</div>
      <ul class="flex flex-col gap-1 text-lg">
        <For each={reports()}>
          {(report) => (
            <li>
              <A href={`/${activeFacility()?.url}/${report.path}`} class="flex items-center gap-2">
                <OcTable3 class="shrink-0" />
                <Capitalize text={report.label} />
              </A>
            </li>
          )}
        </For>
      </ul>
      <A href="/help/reports">
        {t("reports.more_info")} <InfoIcon title="" />
      </A>
    </div>
  );
}) satisfies VoidComponent;
