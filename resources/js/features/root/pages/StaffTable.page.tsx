import {cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";
import {Email} from "components/ui/Email";

export default (() => {
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={FacilityStaff.keys.staff()}
        staticEntityURL={`facility/${activeFacilityId()}/user/staff`}
        staticTranslations={createTableTranslations("staff")}
        staticPersistenceKey="facilityStaff"
        columns={[
          {name: "id", initialVisible: false},
          {name: "name", columnDef: {enableHiding: false}},
          {name: "email", columnDef: {cell: cellFunc<string>((v) => <Email class="w-full" email={v} />)}},
          {name: "hasEmailVerified", initialVisible: false},
          {name: "hasPassword"},
          {name: "passwordExpireAt", initialVisible: false},
          {
            name: "hasGlobalAdmin",
            columnDef: {
              cell: cellFunc<boolean>((adm) => <span class="w-full text-center">{adm ? "💪🏽" : ""}</span>),
              size: 130,
            },
            initialVisible: false,
          },
          {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false},
          {name: "createdBy.name", initialVisible: false},
          {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
        ]}
        initialSort={[{id: "name", desc: false}]}
      />
    </>
  );
}) satisfies VoidComponent;
