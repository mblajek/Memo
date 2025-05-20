import {FullCalendar} from "components/ui/meetings-calendar/FullCalendar";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  return (
    <FullCalendar
      class="w-full h-full"
      staticCalendarFunction="leaveTimes"
      staticModes={["month"]}
      staticSelectionPersistenceKey={`facility.${activeFacilityId()}.leaveTimes.calendar`}
      pageInfo={{href: "/help/staff-absences"}}
    />
  );
}) satisfies VoidComponent;
