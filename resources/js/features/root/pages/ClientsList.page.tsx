import {PaddedCell, cellFunc, createTableTranslations} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {FacilityClient} from "data-access/memo-api/groups/FacilityClient";
import {UserLink} from "features/facility-users/UserLink";
import {VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  return (
    <>
      <TQueryTable
        mode="standalone"
        staticPrefixQueryKey={FacilityClient.keys.client()}
        staticEntityURL={`facility/${activeFacilityId()}/user/client`}
        staticTranslations={createTableTranslations("client")}
        staticPersistenceKey="facilityClients"
        columns={[
          {name: "id", initialVisible: false},
          {
            name: "name",
            extraDataColumns: ["id"],
            columnDef: {
              cell: cellFunc<string>((v, ctx) => (
                <PaddedCell>
                  <UserLink type="clients" userId={ctx.row.original.id as string} name={v} />
                </PaddedCell>
              )),
              enableHiding: false,
            },
          },
          // {name: "genderDictId"},
          {name: "createdAt", columnDef: {sortDescFirst: true}, initialVisible: false},
          {name: "createdBy.name", initialVisible: false},
          {name: "updatedAt", columnDef: {sortDescFirst: true}, initialVisible: false},
        ]}
        initialSort={[{id: "name", desc: false}]}
      />
    </>
  );
}) satisfies VoidComponent;
