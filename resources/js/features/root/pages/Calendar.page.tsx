import {FullCalendar} from "components/ui/calendar/FullCalendar";
import {useHolidays} from "components/ui/calendar/holidays";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const holidays = useHolidays();
  return (
    <FullCalendar
      class="w-full h-full"
      locale={new Intl.Locale("pl")}
      holidays={holidays()}
      staticPersistenceKey={`facility.${activeFacilityId()}.calendar`}
      meetingListLinkProps={{href: "table"}}
    />
  );
}) satisfies VoidComponent;
