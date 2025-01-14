import {onCleanup} from "solid-js";

export class Timeout {
  timeoutId: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    onCleanup(() => this.clear());
  }

  set(...[callback, delay]: Parameters<typeof setTimeout>) {
    this.clear();
    this.timeoutId = setTimeout(() => {
      this.timeoutId = undefined;
      callback();
    }, delay);
  }

  clear() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  isSet() {
    return this.timeoutId !== undefined;
  }
}
