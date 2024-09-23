import {A} from "@solidjs/router";
import {Capitalize} from "components/ui/Capitalize";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {EmptyValueSymbol} from "components/ui/symbols";
import {DATE_TIME_FORMAT, useLangFunc} from "components/utils";
import {FullAppVersion} from "features/system-status/app_version";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";

const GITHUB_LINK = "https://github.com/mblajek/Memo";

export default (() => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  return (
    <div class="p-2">
      <h1 class="text-2xl font-bold mb-4">
        <Capitalize text={t("routes.help_pages.about")} />
      </h1>
      <Show when={systemStatusMonitor.lastStatus()}>
        {(status) => (
          <div class="flex flex-col gap-2 items-stretch">
            <div class="grid gap-x-3 gap-y-1 self-start" style={{"grid-template-columns": "auto auto"}}>
              <label class="font-semibold">{t("about_page.app_version")}</label>
              <div>
                <FullAppVersion />
              </div>
              <label class="font-semibold">{t("about_page.app_env")}</label>
              <div>
                <Show when={status().appEnv} fallback={<EmptyValueSymbol />}>
                  {(appEnv) => <>{appEnv()}</>}
                </Show>
              </div>
              <label class="font-semibold">{t("about_page.commit_date")}</label>
              <div>
                <Show when={status().commitDate} fallback={<EmptyValueSymbol />}>
                  {(commitDate) =>
                    DateTime.fromISO(commitDate()).toLocaleString({...DATE_TIME_FORMAT, weekday: "long"})
                  }
                </Show>
              </div>
              <label class="font-semibold">{t("about_page.commit_hash")}</label>
              <div>
                <Show when={status().commitHash} fallback={<EmptyValueSymbol />}>
                  {(commitHash) => (
                    <>
                      <A class="font-mono" href={`${GITHUB_LINK}/tree/${commitHash()}`} target="_blank">
                        {commitHash()}
                      </A>{" "}
                      <CopyToClipboard text={status().commitHash} />
                    </>
                  )}
                </Show>
              </div>
              <label class="font-semibold">{t("about_page.cpu_load")}</label>
              <div>{status().cpu15m.toFixed(2)}</div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}) satisfies VoidComponent;
