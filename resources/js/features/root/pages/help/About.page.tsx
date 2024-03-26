import {A} from "@solidjs/router";
import {Capitalize} from "components/ui/Capitalize";
import {CopyToClipboard} from "components/ui/CopyToClipboard";
import {EMPTY_VALUE_SYMBOL} from "components/ui/symbols";
import {DATE_TIME_FORMAT, useLangFunc} from "components/utils";
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
      <Show when={systemStatusMonitor.status()}>
        {(status) => (
          <div class="flex flex-col gap-2 items-stretch">
            <div class="grid gap-x-3 gap-y-1 self-start" style={{"grid-template-columns": "auto auto"}}>
              <label class="font-medium">{t("about_page.commit_date")}</label>
              <div>
                <Show when={status().commitDate} fallback={EMPTY_VALUE_SYMBOL}>
                  {(commitDate) =>
                    DateTime.fromISO(commitDate()).toLocaleString({...DATE_TIME_FORMAT, weekday: "long"})
                  }
                </Show>
              </div>
              <label class="font-medium">{t("about_page.commit_hash")}</label>
              <div>
                <Show when={status().commitHash} fallback={EMPTY_VALUE_SYMBOL}>
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
              <label class="font-medium">{t("about_page.backend_hash")}</label>
              <div>
                <span class="font-mono">{status().backendHash}</span> <CopyToClipboard text={status().backendHash} />
              </div>
              <label class="font-medium">{t("about_page.frontend_hash")}</label>
              <div>
                <span class="font-mono">{status().frontendHash}</span> <CopyToClipboard text={status().frontendHash} />
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}) satisfies VoidComponent;
