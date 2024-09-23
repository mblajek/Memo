import {IANAZone, Settings, SystemZone, Zone} from "luxon";
import {createEffect, createSignal, ParentComponent, Show} from "solid-js";
import {useActiveFacility} from "state/activeFacilityId.state";

const [getTimeZone, setTimeZone] = createSignal<Zone>(SystemZone.instance);

export const timeZone = getTimeZone;

/**
 * Sets time timeZone signal based on the current facility time zone,
 * sets the default luxon time zone, and recreates children when the time zone changes. */
export const TimeZoneController: ParentComponent = (props) => {
  const [show, setShow] = createSignal(true);
  const activeFacility = useActiveFacility();
  createEffect(() => {
    const desiredTimeZone = activeFacility() ? IANAZone.create(activeFacility()!.timezone) : SystemZone.instance;
    if (!timeZonesEqual(timeZone(), desiredTimeZone)) {
      setShow(false);
      setTimeout(() => {
        setTimeZone(desiredTimeZone);
        Settings.defaultZone = desiredTimeZone;
        setShow(true);
      }, 1);
    }
  });
  return <Show when={show()}>{props.children}</Show>;
};

function timeZonesEqual(a: Zone, b: Zone) {
  return a === b || a.name === b.name || a.offset(Date.now()) === b.offset(Date.now());
}

export function usesLocalTimeZone() {
  return timeZonesEqual(timeZone(), SystemZone.instance);
}
