import {createQuery} from "@tanstack/solid-query";
import {Recreator} from "components/utils/Recreator";
import {System} from "data-access/memo-api/groups/System";
import {IANAZone, Settings, SystemZone, Zone} from "luxon";
import {createEffect, createSignal, ParentComponent} from "solid-js";

const [getTimeZone, setTimeZone] = createSignal<Zone>(SystemZone.instance);

export const timeZone = getTimeZone;

/**
 * Sets time timeZone signal based on the current facility time zone,
 * sets the default luxon time zone, and recreates children when the time zone changes. */
export const TimeZoneController: ParentComponent = (props) => {
  const systemStatus = createQuery(System.statusQueryOptions);
  createEffect(() => {
    const desiredTimeZone = systemStatus.data?.userTimezone
      ? IANAZone.create(systemStatus.data.userTimezone)
      : SystemZone.instance;
    if (!timeZonesEqual(timeZone(), desiredTimeZone)) {
      Settings.defaultZone = desiredTimeZone;
      setTimeZone(desiredTimeZone);
    }
  });
  return <Recreator signal={timeZone}>{props.children}</Recreator>;
};

function timeZonesEqual(a: Zone, b: Zone) {
  return a === b || a.name === b.name || a.offset(Date.now()) === b.offset(Date.now());
}

export function usesLocalTimeZone() {
  return timeZonesEqual(timeZone(), SystemZone.instance);
}
