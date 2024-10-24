import {A} from "@solidjs/router";
import {Capitalize} from "components/ui/Capitalize";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {EmptyValueSymbol} from "components/ui/symbols";
import {currentTimeSecond, DATE_TIME_FORMAT, SilentAccessBarrier, useLangFunc} from "components/utils";
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
              <label class="font-semibold">{t("about_page.commit_info")}</label>
              <div class="flex gap-1 items-baseline">
                <Show when={status().commitHash} fallback={<EmptyValueSymbol />}>
                  {(commitHash) => (
                    <>
                      <A class="font-mono" href={`${GITHUB_LINK}/commits/${commitHash()}`} target="_blank">
                        {commitHash().slice(0, 7)}
                      </A>
                      <CopyToClipboard text={commitHash()} />
                    </>
                  )}
                </Show>
                <Show when={status().commitDate} fallback={<EmptyValueSymbol />}>
                  {(commitDate) => (
                    <span>
                      {t("parenthesised", {
                        text: DateTime.fromISO(commitDate()).toLocaleString({...DATE_TIME_FORMAT, weekday: "long"}),
                      })}
                    </span>
                  )}
                </Show>
              </div>
              <SilentAccessBarrier roles={["globalAdmin"]}>
                <label class="font-semibold">{t("about_page.last_dump")}</label>
                <div>
                  <Show when={status().lastDump} fallback={<EmptyValueSymbol />}>
                    {(lastDump) => {
                      const lastDumpDate = () => DateTime.fromISO(lastDump());
                      return (
                        <div>
                          {lastDumpDate().toRelative({base: currentTimeSecond(), style: "short"})}{" "}
                          <span class="text-grey-text">
                            {t("parenthesised", {
                              text: lastDumpDate().toLocaleString({...DATE_TIME_FORMAT, weekday: "long"}),
                            })}
                          </span>
                        </div>
                      );
                    }}
                  </Show>
                </div>
                <label class="font-semibold">{t("about_page.cpu_load")}</label>
                <div>{status().cpu15m.toFixed(2)}</div>
              </SilentAccessBarrier>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}) satisfies VoidComponent;
