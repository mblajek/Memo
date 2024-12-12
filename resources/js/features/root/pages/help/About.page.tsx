import {A} from "@solidjs/router";
import {Capitalize} from "components/ui/Capitalize";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {EmptyValueSymbol} from "components/ui/symbols";
import {currentTimeSecond, DATE_TIME_FORMAT, SilentAccessBarrier, useLangFunc} from "components/utils";
import {toggleDEV} from "components/utils/dev_mode";
import {useDeveloperPermission} from "features/authentication/developer_permission";
import {FullAppVersion} from "features/system-status/app_version";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {DateTime} from "luxon";
import {Show, VoidComponent} from "solid-js";

const GITHUB_LINK = "https://github.com/mblajek/Memo";

export default (() => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  const developerPermission = useDeveloperPermission();
  return (
    <div class="p-2 flex flex-col gap-4">
      <div>
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
                  <label
                    class="font-semibold"
                    onPointerDown={(e) => {
                      const sel = document.getSelection();
                      if (
                        sel &&
                        !sel.isCollapsed &&
                        e.currentTarget.contains(sel.anchorNode) &&
                        e.currentTarget.contains(sel.focusNode)
                      ) {
                        const range = [sel.anchorOffset, sel.focusOffset].sort((a, b) => a - b).join("..");
                        if (range === "1..2") {
                          toggleDEV();
                          sel.empty();
                        } else if (range === "2..3") {
                          developerPermission.enable(!developerPermission.enabled());
                          sel.empty();
                        }
                      }
                    }}
                  >
                    {t("about_page.cpu_load")}
                  </label>
                  <div>{status().cpu15m.toFixed(2)}</div>
                </SilentAccessBarrier>
              </div>
            </div>
          )}
        </Show>
      </div>
      <A href="/help/privacy-policy">{t("privacy_policy")}</A>
    </div>
  );
}) satisfies VoidComponent;
