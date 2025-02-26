import {useEventListener} from "components/utils/event_listener";
import {currentTimeMinute, currentTimeSecond} from "components/utils/time";
import {createEffect} from "solid-js";

interface IdleDetectorConfig {
  readonly timeSecs: number;
  readonly func: () => void;
}

/**
 * Creates an idle detector which calls the func after the specified time of user inactivity.
 * If the inactivity continues, repeats calling func every timeSecs.
 *
 * The time measurement is precise to seconds for small timeSecs values, and to minutes
 * for higher values.
 */
export function createIdleDetector(config: IdleDetectorConfig) {
  let lastActiveMillis = Date.now();
  function activeNow() {
    lastActiveMillis = Date.now();
  }
  useEventListener(document, "mousemove", activeNow);
  useEventListener(document, "keydown", activeNow);
  const currentTime = config.timeSecs <= 5 * 60 ? currentTimeSecond : currentTimeMinute;
  createEffect(() => {
    if (currentTime().toMillis() >= lastActiveMillis + config.timeSecs * 1000) {
      config.func();
      activeNow();
    }
  });
}
