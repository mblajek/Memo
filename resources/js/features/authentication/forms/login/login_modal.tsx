import {Button} from "components/ui/Button";
import {FullLogo} from "components/ui/FullLogo";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {DATE_TIME_FORMAT, useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {V1} from "data-access/memo-api/config";
import {ThemeIcon, useThemeControl} from "features/root/components/theme_control";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {DateTime} from "luxon";
import {LoginForm} from "./Login.form";

export const createLoginModal = registerGlobalPageElement<true>((args) => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  const {toggleTheme} = useThemeControl();
  return (
    <Modal open={args.params()} style={MODAL_STYLE_PRESETS.narrow}>
      <div class="flex flex-col gap-4">
        <div class="flex flex-col">
          <FullLogo class="w-full h-16" />
          <div class="flex gap-1 justify-end">
            <span
              class="text-grey-text"
              title={`${t("about_page.commit_date")} ${systemStatusMonitor.status()?.commitDate ? DateTime.fromISO(systemStatusMonitor.status()!.commitDate!).toLocaleString(DATE_TIME_FORMAT) : "?"}`}
              onDblClick={() => {
                getSelection()?.empty();
                open(`${V1.defaults.baseURL}/system/status`, "_blank");
              }}
            >
              {t("app_version_short", {version: systemStatusMonitor.status()?.version})}
            </span>
          </div>
        </div>
        <div class="flex flex-col relative">
          <div class="absolute top-0 right-0 z-10">
            <Button onClick={toggleTheme}>
              <ThemeIcon title={t("switch_theme")} />
            </Button>
          </div>
          <LoginForm onSuccess={args.clearParams} />
        </div>
      </div>
    </Modal>
  );
});
