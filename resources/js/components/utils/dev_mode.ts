import {DEV, createSignal} from "solid-js";

const [dev, setDev] = createSignal(!!DEV);

/**
 * The DEV mode.
 *
 * The DEV mode can be toggled in the user menu if the user has the "developer" permission, or if
 * the app is in the SolidJS DEV mode (i.e. not built).
 */
export const isDEV = dev;

export function toggleDEV(value?: boolean) {
  setDev(value ?? !dev());
}
