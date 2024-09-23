import {DateTime, Duration, Settings} from "luxon";
import {getWeekInfo} from "./components/utils";

declare module "luxon" {
  interface TSSettings {
    throwOnInvalid: true;
  }
}

export function luxonInit() {
  Settings.throwOnInvalid = true;

  Settings.defaultWeekSettings = getWeekInfo(new Intl.Locale(navigator.language));

  // Prevent the luxon classes from serialising as strings, to make it possible to write a custom
  // serialiser that retains the class information.
  for (const cl of [DateTime, Duration]) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (cl as any).prototype.toJSON;
  }
}
