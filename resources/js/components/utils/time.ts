import {DateTime} from "luxon";
import {createSignal} from "solid-js";

// Current time, with seconds accuracy.
const [getCurrentTime, setCurrentTime] = createSignal(DateTime.now());
// Current time, with minutes accuracy.
const [getCurrentTimeMinute, setCurrentTimeMinute] = createSignal(DateTime.now().startOf("minute"));
// Current date, with days accuracy.
const [getCurrentDate, setCurrentDate] = createSignal(DateTime.now().startOf("day"));

function update() {
  const now = DateTime.now();
  if (now.minute !== getCurrentTimeMinute().minute) {
    setCurrentTimeMinute(now.startOf("minute"));
    if (now.day !== getCurrentTime().day) {
      setCurrentDate(now.startOf("day"));
    }
  }
  setCurrentTime(now);
  // Update again at the start of the next second.
  setTimeout(update, 1000 - now.millisecond);
}

// Start updating the time indefinitely.
// eslint-disable-next-line solid/reactivity
update();

export const currentTime = getCurrentTime;
export const currentTimeMinute = getCurrentTimeMinute;
export const currentDate = getCurrentDate;
