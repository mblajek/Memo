import {Title} from "@solidjs/meta";
import {EM_DASH} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {translationsLoaded} from "i18n_loader";
import {DEV, VoidComponent} from "solid-js";

interface Props {
  readonly title?: string;
}

export const MemoTitle: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  // The title is specified as a function instead of directly in JSX because the MemoTitle component
  // is used in router, and for some reason some usage of JSX causes warnings about
  // "computations created outside a `createRoot` or `render`". This fixes it.
  const fullTitle = () => {
    if (!translationsLoaded()) {
      return "Memo";
    }
    return `${props.title ? `${props.title} ${EM_DASH} ` : ""}${t("app_name")}${DEV ? " (DEV mode)" : ""}`;
  };
  return <Title>{fullTitle()}</Title>;
};
