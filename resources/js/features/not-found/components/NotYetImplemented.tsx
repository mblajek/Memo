import {useLocation} from "@solidjs/router";
import {useLangFunc} from "components/utils/lang";
import {VoidComponent} from "solid-js";

export default (() => {
  const t = useLangFunc();
  const location = useLocation();
  return (
    <div class="w-fit bg-blue-50 m-2 p-4 rounded-md">
      <h1 class="text-xl text-center mb-2">{t("errors.page_not_yet_implemented.title")}</h1>
      <p>{t("errors.page_not_yet_implemented.body", {url: location.pathname})}</p>
    </div>
  );
}) satisfies VoidComponent;
