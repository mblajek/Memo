import {DateTime, Settings} from "luxon";
import {createSignal} from "solid-js";
import {timeZone} from "time_zone_controller";

// Current time, with seconds accuracy.
const [getCurrentTimeSecond, setCurrentTimeSecond] = createSignal(DateTime.now());
// Current time, with minutes accuracy.
const [getCurrentTimeMinute, setCurrentTimeMinute] = createSignal(DateTime.now().startOf("minute"));
// Current date, with days accuracy.
const [getCurrentDate, setCurrentDate] = createSignal(DateTime.now().startOf("day"));

let lastTimeZone = timeZone();

function update() {
  const now = DateTime.now();
  if (now.minute !== getCurrentTimeMinute().minute) {
    setCurrentTimeMinute(now.startOf("minute"));
    if (now.day !== getCurrentTimeSecond().day) {
      setCurrentDate(now.startOf("day"));
    }
  }
  // Don't use signals to avoid creating effects without owner.
  if (timeZone() !== lastTimeZone) {
    setCurrentTimeMinute((t) => t.setZone(timeZone()));
    setCurrentTimeSecond((t) => t.setZone(timeZone()));
    lastTimeZone = timeZone();
  }
  setCurrentTimeSecond(now);
  // Update again at the start of the next second.
  setTimeout(update, 1000 - now.millisecond);
}

// Start updating the time indefinitely.
// eslint-disable-next-line solid/reactivity
update();

export const currentTimeSecond = getCurrentTimeSecond;
export const currentTimeMinute = getCurrentTimeMinute;
export const currentDate = getCurrentDate;

export function withNoThrowOnInvalid<T>(func: () => T) {
  try {
    Settings.throwOnInvalid = false;
    return func();
  } finally {
    Settings.throwOnInvalid = true;
  }
}
