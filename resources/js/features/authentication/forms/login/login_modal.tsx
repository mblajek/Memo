import {A} from "@solidjs/router";
import {Button} from "components/ui/Button";
import {FullLogo} from "components/ui/FullLogo";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {V1} from "data-access/memo-api/config";
import {ThemeIcon, useThemeControl} from "features/root/components/theme_control";
import {useSystemStatusMonitor} from "features/system-status/system_status_monitor";
import {DateTime} from "luxon";
import {Show} from "solid-js";
import {LoginForm} from "./Login.form";

export const createLoginModal = registerGlobalPageElement<true>((args) => {
  const t = useLangFunc();
  const systemStatusMonitor = useSystemStatusMonitor();
  const {toggleTheme} = useThemeControl();
  return (
    <Modal open={args.params()} style={MODAL_STYLE_PRESETS.narrow}>
      <div class="flex flex-col gap-4">
        <FullLogo class="w-full h-16" />
        <div class="flex flex-col relative">
          <div class="absolute top-0 right-0">
            <Button onClick={toggleTheme}>
              <ThemeIcon title={t("switch_theme")} />
            </Button>
          </div>
          <LoginForm onSuccess={args.clearParams} />
          <Show when={systemStatusMonitor.status()?.commitDate}>
            {(commitDate) => (
              <div class="relative">
                <A
                  class="absolute top-1 right-0 !text-gray-200"
                  style={{"font-size": "0.5rem"}}
                  href={`${V1.defaults.baseURL}/system/status`}
                  target="_blank"
                >
                  {DateTime.fromISO(commitDate()).toFormat("yyyyMMddHHmmss")}
                </A>
              </div>
            )}
          </Show>
        </div>
      </div>
    </Modal>
  );
});
