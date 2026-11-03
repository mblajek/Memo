import {MemoAPI} from "./api.ts";
import {log} from "./log.ts";

/**
 * Puts the run in the time zone in which the app shows the times: this process, and through the
 * variable the workers and the browsers started after it. The times the tests expect, and the days
 * of the data they make, are then those of the pages, whatever the zone of the machine.
 */
export async function useAppTimeZone() {
  const api = await MemoAPI.spawn();
  try {
    const {userTimezone} = await api.getData<{userTimezone: string}>("system/status");
    if (process.env.TZ !== userTimezone) {
      log.info(`Time zone of the run: ${userTimezone}, the app's`);
      process.env.TZ = userTimezone;
    }
    // With a name it does not take (unknown, or in another case), Node runs in UTC silently, and
    // has no zone name then.
    if (!new Intl.DateTimeFormat().resolvedOptions().timeZone) {
      throw new Error(`Node cannot run in the app's time zone ${userTimezone}`);
    }
  } finally {
    await api.dispose();
  }
}
