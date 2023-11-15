import {Title} from "@solidjs/meta";
import {NBSP} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {translationsLoaded} from "i18n_loader";
import {DEV, VoidComponent} from "solid-js";

interface Props {
  /** A translations sub-key in routes defining the page title. */
  routeKey: string;
}

export const MemoTitle: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const pageName = () => {
    const name = t(`routes.${props.routeKey}`, {defaultValue: ""});
    if (!name) {
      return props.routeKey;
    }
    return name.slice(0, 1).toUpperCase() + name.slice(1);
  };
  // The title is specified as a function instead of directly in JSX because the MemoTitle component
  // is used in router, and for some reason some usage of JSX causes warnings about
  // "computations created outside a `createRoot` or `render`". This fixes it.
  const title = () => {
    if (!translationsLoaded()) {
      return "Memo";
    }
    return `${pageName()}${NBSP}${NBSP}—${NBSP}${NBSP}${t("app_name")}${DEV ? " (DEV mode)" : undefined}`;
  };
  return <Title>{title()}</Title>;
};
