import {Button} from "components/ui/Button";
import {FullLogo} from "components/ui/FullLogo";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {useLangFunc} from "components/utils";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {ThemeIcon, useThemeControl} from "features/root/components/theme_control";
import {LoginForm} from "./Login.form";

export const createLoginModal = registerGlobalPageElement<true>((args) => {
  const t = useLangFunc();
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
        </div>
      </div>
    </Modal>
  );
});
