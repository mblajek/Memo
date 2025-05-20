import {isDEV} from "components/utils/dev_mode";
import {useLangFunc} from "components/utils/lang";
import {translationsLoadedPromise} from "i18n_loader";
import {VoidComponent} from "solid-js";

export const AntiSelfXSSInfo: VoidComponent = () => {
  const t = useLangFunc();
  setTimeout(() => {
    void translationsLoadedPromise.then(() => {
      if (!isDEV()) {
        // eslint-disable-next-line no-console
        console.log(
          "%c%s\n%c%s",
          "color: red; font-size: 40px;",
          t("anti_self_xss.header"),
          "font-size: 18px;",
          t("anti_self_xss.message"),
        );
      }
    });
  }, 1500);
  return <></>;
};
