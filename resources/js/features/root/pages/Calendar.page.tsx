import {FullCalendar} from "components/ui/calendar/FullCalendar";
import {DateTime} from "luxon";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  return (
    <FullCalendar
      class="w-full h-full"
      locale={new Intl.Locale("pl")}
      holidays={[
        [8, 15],
        [11, 11],
        [11, 1],
        [12, 25],
        [12, 26],
      ].map(([month, day]) => DateTime.fromObject({month, day}))}
      staticPersistenceKey={`facility.${activeFacilityId()}.calendar`}
      meetingListLinkProps={{href: "table"}}
    />
  );
}) satisfies VoidComponent;
