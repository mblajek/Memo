import {A} from "@solidjs/router";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {createTableTranslations} from "components/ui/Table/Table";
import {useCustomTableCells} from "components/ui/Table/custom_table_cells";
import {cellFunc, PaddedCell, ShowCellVal} from "components/ui/Table/table_cells";
import {actionIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils/lang";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {useTableAttributeColumnConfigs} from "features/client/ClientFields";
import {UserLink} from "features/facility-users/UserLink";
import {VoidComponent} from "solid-js";
import {activeFacilityId, useActiveFacility} from "state/activeFacilityId.state";

export default (() => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const customTableCells = useCustomTableCells();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const tableAttributeColumnConfigs = useTableAttributeColumnConfigs();
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityClient.keys.client()}
      staticEntityURL={`facility/${activeFacilityId()}/user/client`}
      staticTranslations={createTableTranslations(["client", "facility_user", "user"])}
      staticPersistenceKey="facilityClients"
      columns={[
        {name: "id", initialVisible: false},
        {
          name: "name",
          extraDataColumns: ["id"],
          columnDef: {
            cell: cellFunc<string>((props) => (
              <PaddedCell>
                <ShowCellVal v={props.v}>
                  {(v) => <UserLink type="clients" userId={props.row.id as string} userName={v()} />}
                </ShowCellVal>
              </PaddedCell>
            )),
            enableHiding: false,
          },
        },
        tableAttributeColumnConfigs.client(),
        {name: "client.groups.count", initialVisible: false},
        {name: "client.groups.*.role", initialVisible: false},
        {
          name: "client.groups.*.clients.*.userId",
          columnDef: {cell: customTableCells.facilityUsers()},
          initialVisible: false,
        },
        {name: "isManagedByThisFacility", initialVisible: false},
        {name: "managedByFacility.name", initialVisible: false},
        {name: "firstMeetingDate", initialVisible: false},
        {name: "lastMeetingDate"},
        {name: "completedMeetingsCount"},
        {name: "completedMeetingsCountLastMonth", initialVisible: false},
        {name: "plannedMeetingsCount", initialVisible: false},
        {name: "plannedMeetingsCountNextMonth"},
        ...getCreatedUpdatedColumns({entity: "client"}),
      ]}
      columnGroups={{overrides: {attendant_multicolumn: false}}}
      intrinsicSort={[
        {type: "column", column: "lastMeetingDate", desc: true},
        {type: "column", column: "name", desc: false},
      ]}
      initialSort={[{id: "lastMeetingDate", desc: true}]}
      customSectionBelowTable={
        <div class="ml-2 flex gap-1">
          <A
            role="button"
            class="primary small !px-2 flex flex-col justify-center"
            href={`/${activeFacility()?.url}/clients/create`}
          >
            <div>
              <actionIcons.Add class="inlineIcon" /> {t("actions.client.add")}
            </div>
          </A>
        </div>
      }
      savedViews
    />
  );
}) satisfies VoidComponent;
