import {isPickSaveFileSupported} from "components/utils/files";
import {htmlAttributes} from "components/utils/html_attributes";
import {useLangFunc} from "components/utils/lang";
import {VoidComponent} from "solid-js";

export const CSVExportSupportWarning: VoidComponent<htmlAttributes.div> = (props) => {
  const t = useLangFunc();
  // eslint-disable-next-line solid/components-return-once
  return isPickSaveFileSupported() ? undefined : (
    <div {...htmlAttributes.merge(props, {class: "font-semibold text-red-700 max-w-xs"})}>
      {t("csv_export.unsupported")}
    </div>
  );
};
