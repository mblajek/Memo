import {Settings} from "luxon";

declare module "luxon" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

Settings.throwOnInvalid = true;
