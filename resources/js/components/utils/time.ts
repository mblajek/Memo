import "init_luxon";

import {DateTime, Settings} from "luxon";
import {createMemo, createRoot, createSignal} from "solid-js";
import {timeZone} from "time_zone_controller";

// The current instant, updated every second.
const [getNow, setNow] = createSignal(DateTime.now());

function update() {
  const now = DateTime.now();
  setNow(now);
  // Update again at the start of the next second.
  setTimeout(update, 1000 - now.millisecond);
}

// Start updating the time indefinitely.
update();

function sameTime(a: DateTime, b: DateTime) {
  return a.toMillis() === b.toMillis() && a.zone.equals(b.zone);
}

// The values are derived from the time zone as well, so that they are already correct when
// something reads them right after the time zone changes.
export const {currentTimeSecond, currentTimeMinute, currentDate} = createRoot(() => {
  /** Current time, with seconds accuracy. */
  const currentTimeSecond = createMemo(() => getNow().setZone(timeZone()));
  /** Current time, with minutes accuracy. */
  const currentTimeMinute = createMemo(() => currentTimeSecond().startOf("minute"), undefined, {equals: sameTime});
  /** Current date, with days accuracy. */
  const currentDate = createMemo(() => currentTimeMinute().startOf("day"), undefined, {equals: sameTime});
  return {currentTimeSecond, currentTimeMinute, currentDate};
});

export function withNoThrowOnInvalid<T extends {isValid: boolean} | undefined>(
  func: () => T,
  fallbackOnInvalid: () => T,
): T;
export function withNoThrowOnInvalid<T>(func: () => T): T;
export function withNoThrowOnInvalid<T>(func: () => T, fallbackOnInvalid?: () => T) {
  let result: T;
  try {
    Settings.throwOnInvalid = false;
    result = func();
  } finally {
    Settings.throwOnInvalid = true;
  }
  if (
    fallbackOnInvalid &&
    result !== undefined &&
    "isValid" in (result as {isValid?: boolean}) &&
    !(result as {isValid: boolean}).isValid
  ) {
    return fallbackOnInvalid();
  }
  return result;
}
