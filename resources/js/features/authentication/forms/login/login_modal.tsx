import {Button} from "components/ui/Button";
import {FullLogo} from "components/ui/FullLogo";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {title} from "components/ui/title";
import {DATE_TIME_FORMAT, useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {V1} from "data-access/memo-api/config";
import {ThemeIcon, useThemeControl} from "features/root/components/theme_control";
import {BaseAppVersion} from "features/system-status/app_version";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {DateTime} from "luxon";
import {LoginForm} from "./Login.form";

type _Directives = typeof title;

interface Params {
  readonly lightBackdrop?: boolean;
}

export const createLoginModal = registerGlobalPageElement<Params | true>((args) => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  const {toggleTheme} = useThemeControl();
  const backdropClass = () => {
    const params = args.params();
    return typeof params === "object" && params?.lightBackdrop ? "bg-black/10" : undefined;
  };
  return (
    <Modal
      open={args.params()}
      style={MODAL_STYLE_PRESETS.narrow}
      backdropClass={backdropClass()}
      title={<FullLogo class="w-full h-16" />}
    >
      <div class="flex flex-col gap-4">
        <div class="flex gap-1 justify-end">
          <span
            class="text-grey-text"
            use:title={`${t("about_page.commit_date")} ${
              systemStatusMonitor.baseStatus()?.commitDate
                ? DateTime.fromISO(systemStatusMonitor.baseStatus()!.commitDate!).toLocaleString(DATE_TIME_FORMAT)
                : "?"
            }`}
            onDblClick={() => {
              getSelection()?.empty();
              open(`${V1.defaults.baseURL}/system/status`, "_blank");
            }}
          >
            <BaseAppVersion />
          </span>
        </div>
        <div class="flex flex-col relative">
          <div class="absolute top-0 right-0 z-10">
            <Button onClick={toggleTheme} title={t("switch_theme")}>
              <ThemeIcon />
            </Button>
          </div>
          <LoginForm onSuccess={args.clearParams} />
        </div>
      </div>
    </Modal>
  );
});
