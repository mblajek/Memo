import {useLangFunc} from "components/utils";
import {Api} from "./types";

export function translateError(error: Api.Error, t = useLangFunc()) {
  return t(error.code, {
    ...(Api.isValidationError(error) ? {attribute: error.field} : undefined),
    ...error.data,
  });
}
