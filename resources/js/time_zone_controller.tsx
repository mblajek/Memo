import {useQuery} from "@tanstack/solid-query";
import {Recreator} from "components/utils/Recreator";
import {System} from "data-access/memo-api/groups/System";
import {DateTime, IANAZone, Settings, SystemZone, Zone} from "luxon";
import {createEffect, createSignal, ParentComponent} from "solid-js";

const [getTimeZone, setTimeZone] = createSignal<Zone>(SystemZone.instance);

export const timeZone = getTimeZone;

/**
 * Sets time timeZone signal based on the current facility time zone,
 * sets the default luxon time zone, and recreates children when the time zone changes.
 */
export const TimeZoneController: ParentComponent = (props) => {
  const systemStatus = useQuery(System.statusQueryOptions);
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

/**
 * Returns whether the time zones are the same, or give the same local time now and at monthly
 * intervals up to half a year back and forward.
 */
function timeZonesEqual(a: Zone, b: Zone) {
  if (a === b || a.name === b.name) {
    return true;
  }
  const now = DateTime.now();
  for (let months = -6; months <= 6; months++) {
    const ts = now.plus({months}).toMillis();
    if (a.offset(ts) !== b.offset(ts)) {
      return false;
    }
  }
  return true;
}

export function usesLocalTimeZone() {
  return timeZonesEqual(timeZone(), SystemZone.instance);
}
