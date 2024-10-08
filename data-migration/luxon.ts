import * as luxon from "https://esm.sh/luxon@latest";

luxon.Settings.throwOnInvalid = true;
declare module "https://esm.sh/luxon@latest" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

luxon.DateTime.prototype.toJSON = function () {
  return this.toUTC().set({millisecond: 0}).toISO({suppressMilliseconds: true});
};

export default luxon;
