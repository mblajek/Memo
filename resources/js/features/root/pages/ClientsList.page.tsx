import {A} from "@solidjs/router";
import {PaddedCell, ShowCellVal, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {ACTION_ICONS} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {UserLink} from "features/facility-users/UserLink";
import {VoidComponent} from "solid-js";
import {activeFacilityId, useActiveFacility} from "state/activeFacilityId.state";

export default (() => {
  const t = useLangFunc();
  const activeFacility = useActiveFacility();
  const {getCreatedUpdatedColumns} = useTableColumns();
  return (
    <>
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
                    {(v) => <UserLink type="clients" userId={props.row.id as string} name={v()} />}
                  </ShowCellVal>
                </PaddedCell>
              )),
              enableHiding: false,
            },
          },
          {name: "client.genderDictId"},
          {name: "firstMeetingDate", initialVisible: false},
          {name: "lastMeetingDate"},
          {name: "completedMeetingsCount"},
          {name: "completedMeetingsCountLastMonth", initialVisible: false},
          {name: "plannedMeetingsCount", initialVisible: false},
          {name: "plannedMeetingsCountNextMonth"},
          ...getCreatedUpdatedColumns({includeUpdatedBy: false}),
        ]}
        initialSort={[{id: "name", desc: false}]}
        customSectionBelowTable={
          <div class="ml-2 flex gap-1">
            <A
              role="button"
              class="primary small !px-2 flex flex-col justify-center"
              href={`/${activeFacility()!.url}/clients/create`}
            >
              <div>
                <ACTION_ICONS.add class="inlineIcon text-current" /> {t("actions.client.add")}
              </div>
            </A>
          </div>
        }
      />
    </>
  );
}) satisfies VoidComponent;
