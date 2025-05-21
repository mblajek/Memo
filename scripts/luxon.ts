import * as luxon from "https://esm.sh/luxon@latest";

luxon.Settings.throwOnInvalid = true;
declare module "https://esm.sh/luxon@latest" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

export default luxon;
