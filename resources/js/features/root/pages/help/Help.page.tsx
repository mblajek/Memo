import {useParams} from "@solidjs/router";
import {capitalizeString} from "components/ui/Capitalize";
import {useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {currentLanguage} from "i18n_loader";
import {VoidComponent} from "solid-js";
import {Help} from "./Help";

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  return (
    <Help
      title={capitalizeString(t("routes.help"))}
      // In DEV use the local docs files, otherwise use files hosted remotely.
      mdPath={`/${isDEV() ? "docs" : "docs-remote"}/${currentLanguage()}/${params.helpPath}.md`}
    />
  );
}) satisfies VoidComponent;
