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
      pageInfo={{href: "/help/staff-time-tables#calendar", shortDocsHref: "/help/staff-time-tables-calendar.part"}}
    />
  );
}) satisfies VoidComponent;
