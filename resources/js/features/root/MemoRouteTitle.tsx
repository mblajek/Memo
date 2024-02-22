import {capitalizeString} from "components/ui/Capitalize";
import {useLangFunc} from "components/utils";
import {VoidComponent} from "solid-js";
import {MemoTitle} from "./MemoTitle";

interface Props {
  /** A translations sub-key in routes defining the page title. */
  readonly routeKey: string;
}

export const MemoRouteTitle: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const pageName = () => {
    const name = t(`routes.${props.routeKey}`, {defaultValue: ""});
    if (!name) {
      return props.routeKey;
    }
    return capitalizeString(name);
  };
  return <MemoTitle title={pageName()} />;
};
