import {useLangFunc} from "components/utils/lang";
import {Api} from "./types";

export function translateError(error: Api.Error, t = useLangFunc()) {
  return t(error.code, {
    ...(Api.isValidationError(error) ? {attribute: t("validation.quoted_field_name", {text: error.field})} : undefined),
    ...error.data,
    defaultValue: t("exception._unknown", {text: error.code}),
  });
}
