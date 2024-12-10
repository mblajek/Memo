import {useLocation} from "@solidjs/router";
import {capitalizeString} from "components/ui/Capitalize";
import {useLangFunc} from "components/utils";
import {VoidComponent} from "solid-js";
import {Help} from "./Help";
import {resolveMdFromAppPath} from "./markdown_resolver";

export default (() => {
  const t = useLangFunc();
  const location = useLocation();
  return (
    <Help
      title={capitalizeString(t("routes.help"))}
      // In DEV use the local docs files, otherwise use files hosted remotely.
      mdPath={resolveMdFromAppPath(location.pathname)}
    />
  );
}) satisfies VoidComponent;
