import {useEventListener} from "components/utils/event_listener";
import {currentTimeSecond} from "components/utils/time";
import {createEffect} from "solid-js";

interface IdleDetectorConfig {
  readonly timeSecs: number;
  readonly func: () => void;
}

export function createIdleDetector(config: IdleDetectorConfig) {
  let lastActiveMillis = Date.now();
  function activeNow() {
    lastActiveMillis = Date.now();
  }
  useEventListener(document, "mousemove", activeNow);
  useEventListener(document, "keydown", activeNow);
  createEffect(() => {
    if (currentTimeSecond().toMillis() >= lastActiveMillis + config.timeSecs * 1000) {
      config.func();
      activeNow();
    }
  });
}
