import {FullLogo} from "components/ui/FullLogo";
import {MODAL_STYLE_PRESETS, Modal} from "components/ui/Modal";
import {registerGlobalPageElement} from "components/utils/GlobalPageElements";
import {LoginForm} from "./Login.form";

export const createLoginModal = registerGlobalPageElement<true>((args) => (
  <Modal open={args.params()} style={MODAL_STYLE_PRESETS.narrow}>
    <div class="flex flex-col gap-4">
      <FullLogo class="w-full h-16" />
      <LoginForm onSuccess={args.clearParams} />
    </div>
  </Modal>
));
