import {Title} from "@solidjs/meta";
import {useLangFunc} from "components/utils";
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
  return (
    <Title>
      {pageName()}&nbsp;&nbsp;—&nbsp;&nbsp;{t("app_name")}
      {DEV ? " (DEV mode)" : undefined}
    </Title>
  );
};
