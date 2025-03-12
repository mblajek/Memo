import {isDEV} from "components/utils/dev_mode";
import {useLangFunc} from "components/utils/lang";
import {translationsLoadedPromise} from "i18n_loader";
import {VoidComponent} from "solid-js";

export const AntiSelfXSSInfo: VoidComponent = (props) => {
  const t = useLangFunc();
  setTimeout(async () => {
    await translationsLoadedPromise;
    if (!isDEV()) {
      console.log("%c%s", "color: red; font-size: 40px;", t("anti_self_xss.header"));
      console.log("%c%s", "font-size: 18px;", t("anti_self_xss.message"));
    }
  }, 1500);
  return <></>;
};
