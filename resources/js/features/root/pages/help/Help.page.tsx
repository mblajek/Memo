import {useParams} from "@solidjs/router";
import {capitalizeString} from "components/ui/Capitalize";
import {useLangFunc} from "components/utils";
import {isDEV} from "components/utils/dev_mode";
import {currentLanguage} from "i18n_loader";
import {VoidComponent} from "solid-js";
import {Help} from "./Help";

const MASTER_DOCS_BRANCH = "master-docs";

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  return (
    <Help
      title={capitalizeString(t("routes.help"))}
      // In DEV use the local docs files, otherwise use files directly from GitHub.
      mdPath={`/docs/${isDEV() ? "" : `${MASTER_DOCS_BRANCH}/`}${currentLanguage()}/${params.helpPath}.md`}
    />
  );
}) satisfies VoidComponent;
