import {DateTime} from "luxon";
import {createSignal, onCleanup, onMount} from "solid-js";

export function useCurrentTime() {
  const [currentTime, setCurrentTime] = createSignal(DateTime.now());
  let interval: ReturnType<typeof setInterval>;
  onMount(() => {
    interval = setInterval(() => setCurrentTime(DateTime.now()), 1000);
  });
  onCleanup(() => clearInterval(interval));
  return currentTime;
}

const CURRENT_DATE_UPDATE_INTERVAL_MILLIS = 10 * 1000;

export function useCurrentDate() {
  const [currentDate, setCurrentDate] = createSignal(DateTime.now().startOf("day"), {
    equals: (prev, next) => prev.toMillis() === next.toMillis(),
  });
  let interval: ReturnType<typeof setInterval>;
  onMount(() => {
    interval = setInterval(() => setCurrentDate(DateTime.now().startOf("day")), CURRENT_DATE_UPDATE_INTERVAL_MILLIS);
  });
  onCleanup(() => clearInterval(interval));
  return currentDate;
}
