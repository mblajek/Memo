import {FullCalendar} from "components/ui/calendar/FullCalendar";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  return <FullCalendar class="w-full h-full" staticPersistenceKey={`facility.${activeFacilityId()}.calendar`} />;
}) satisfies VoidComponent;
