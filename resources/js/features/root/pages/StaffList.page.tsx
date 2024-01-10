import {A} from "@solidjs/router";
import {Email} from "components/ui/Email";
import {cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {STAFF_ICONS} from "components/ui/icons";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

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
          {
            name: "name",
            extraDataColumns: ["id"],
            columnDef: {
              cell: cellFunc<string>((v, ctx) => (
                <div class="flex gap-0.5 items-center">
                  <STAFF_ICONS.staff />
                  <A href={ctx.row.getValue("id")}>{v}</A>
                </div>
              )),
              enableHiding: false,
            },
          },
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
