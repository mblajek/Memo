import {useParams} from "@solidjs/router";
import {capitalizeString} from "components/ui/Capitalize";
import {useLangFunc} from "components/utils";
import {currentLanguage} from "i18n_loader";
import {VoidComponent} from "solid-js";
import {Help} from "./Help";

export default (() => {
  const t = useLangFunc();
  const params = useParams();
  return (
    <Help title={capitalizeString(t("routes.help"))} mdPath={`/docs/${currentLanguage()}/${params.helpPath}.md`} />
  );
}) satisfies VoidComponent;
