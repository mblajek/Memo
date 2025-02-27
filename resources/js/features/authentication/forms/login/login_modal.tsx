import {Button} from "components/ui/Button";
import {FullLogo} from "components/ui/FullLogo";
import {Modal, MODAL_STYLE_PRESETS} from "components/ui/Modal";
import {title} from "components/ui/title";
import {BrowserWarning} from "components/utils/BrowserWarning";
import {cx} from "components/utils/classnames";
import {DATE_TIME_FORMAT} from "components/utils/formatting";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {useLangFunc} from "components/utils/lang";
import {doAndClearParams} from "components/utils/modals";
import {V1} from "data-access/memo-api/config/v1.instance";
import {ThemeIcon, useThemeControl} from "features/root/components/theme_control";
import {BaseAppVersion} from "features/system-status/app_version";
import {useEnvInfo} from "features/system-status/env_info";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {DateTime} from "luxon";
import {LoginForm} from "./Login.form";

type _Directives = typeof title;

interface Params {
  readonly lightBackdrop?: boolean;
  readonly onSuccess?: () => void;
}

export const createLoginModal = registerGlobalPageElement<Params | true>((args) => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  const envInfo = useEnvInfo();
  const {toggleTheme} = useThemeControl();
  const params = (): Partial<Params | undefined> => {
    const paramsOrTrue = args.params();
    return paramsOrTrue === true ? {} : paramsOrTrue;
  };
  return (
    <Modal
      open={params()}
      style={MODAL_STYLE_PRESETS.narrow}
      backdropClass={params()?.lightBackdrop ? "bg-black/10" : undefined}
      title={<FullLogo class="w-full h-16" />}
    >
      {(params) => (
        <div class="flex flex-col gap-4">
          <div
            class={cx("flex gap-2 justify-between rounded", envInfo.style() ? "px-1" : "text-grey-text")}
            style={envInfo.style()}
          >
            <div>{envInfo.info()}</div>
            <div
              use:title={`${t("about_page.commit_info")} ${
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
            </div>
          </div>
          <BrowserWarning />
          <div class="flex flex-col relative">
            <div class="absolute top-0 right-0 z-10">
              <Button onClick={toggleTheme} title={t("switch_theme")}>
                <ThemeIcon />
              </Button>
            </div>
            <LoginForm onSuccess={doAndClearParams(args, params().onSuccess)} />
          </div>
        </div>
      )}
    </Modal>
  );
});
