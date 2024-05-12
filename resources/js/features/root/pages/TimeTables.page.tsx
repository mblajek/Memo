import {FullCalendar} from "components/ui/meetings-calendar/FullCalendar";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  return (
    <FullCalendar
      class="w-full h-full"
      staticCalendarFunction="timeTables"
      staticSelectionPersistenceKey={`facility.${activeFacilityId()}.calendar`}
      staticPresentationPersistenceKey="timeTables.calendar.presentation"
    />
  );
}) satisfies VoidComponent;
