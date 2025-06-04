import {createTableTranslations} from "components/ui/Table/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityNotification} from "data-access/memo-api/groups/FacilityNotification";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityNotification.keys.notification()}
      staticEntityURL={`facility/${activeFacilityId()}/notification`}
      staticTranslations={createTableTranslations("notification")}
      staticPersistenceKey="facilityNotifications"
      intrinsicSort={[{type: "column", column: "scheduledAt", desc: true}]}
      columns={[
        {name: "id", initialVisible: false},
        {name: "scheduledAt"},
        {name: "service", columnDef: {size: 100}, initialVisible: false},
        {name: "status", columnDef: {size: 120}},
        {name: "errorMessage"},
        {name: "address", columnDef: {size: 150}},
        {name: "subject", columnDef: {size: 300}},
        ...getCreatedUpdatedColumns(),
      ]}
      initialSort={[{id: "scheduledAt", desc: true}]}
      savedViews
    />
  );
}) satisfies VoidComponent;
