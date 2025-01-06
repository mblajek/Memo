import {createQuery} from "@tanstack/solid-query";
import {createHistoryPersistence} from "components/persistence/history_persistence";
import {CheckboxInput} from "components/ui/CheckboxInput";
import {Email} from "components/ui/Email";
import {cellFunc, createTableTranslations, PaddedCell, ShowCellVal} from "components/ui/Table";
import {TQueryTable} from "components/ui/Table/TQueryTable";
import {NON_NULLABLE, useLangFunc} from "components/utils";
import {User} from "data-access/memo-api/groups";
import {FacilityStaff} from "data-access/memo-api/groups/FacilityStaff";
import {useTableColumns} from "data-access/memo-api/tquery/table_columns";
import {UserLink} from "features/facility-users/UserLink";
import {createSignal, VoidComponent} from "solid-js";
import {activeFacilityId} from "state/activeFacilityId.state";

export default (() => {
  const t = useLangFunc();
  const {getCreatedUpdatedColumns} = useTableColumns();
  const status = createQuery(User.statusQueryOptions);
  const isFacilityAdmin = () => status.data?.permissions.facilityAdmin;
  const [showInactive, setShowInactive] = createSignal(false);
  createHistoryPersistence({
    key: "StaffList",
    value: () => ({showInactive: showInactive()}),
    onLoad: (value) => {
      setShowInactive(value.showInactive);
    },
    onReset: () => {
      setShowInactive(false);
    },
  });
  return (
    <TQueryTable
      mode="standalone"
      staticPrefixQueryKey={FacilityStaff.keys.staff()}
      staticEntityURL={`facility/${activeFacilityId()}/user/staff`}
      staticTranslations={createTableTranslations(["staff", "facility_user", "user"])}
      staticPersistenceKey="facilityStaff"
      columns={[
        {name: "id", initialVisible: false},
        {
          name: "name",
          extraDataColumns: ["id"],
          columnDef: {
            cell: cellFunc<string>((props) => (
              <PaddedCell>
                <ShowCellVal v={props.v}>
                  {(v) => <UserLink type="staff" userId={props.row.id as string} name={v()} />}
                </ShowCellVal>
              </PaddedCell>
            )),
            enableHiding: false,
          },
        },
        {
          name: "email",
          columnDef: {
            cell: cellFunc<string>((props) => (
              <PaddedCell>
                <ShowCellVal v={props.v}>{(v) => <Email class="w-full" email={v()} />}</ShowCellVal>
              </PaddedCell>
            )),
          },
        },
        isFacilityAdmin() ? {name: "hasEmailVerified", initialVisible: false} : undefined,
        {name: "hasPassword"},
        isFacilityAdmin() ? {name: "passwordExpireAt", initialVisible: false} : undefined,
        isFacilityAdmin() ? {name: "lastPasswordChangeAt", initialVisible: false} : undefined,
        {name: "lastLoginSuccessAt", initialVisible: false},
        isFacilityAdmin() ? {name: "lastLoginFailureAt", initialVisible: false} : undefined,
        isFacilityAdmin() ? {name: "staff.isActive", initialVisible: false} : undefined,
        isFacilityAdmin() ? {name: "staff.deactivatedAt", initialVisible: false} : undefined,
        {name: "staff.hasFacilityAdmin", columnDef: {size: 130}},
        {name: "hasGlobalAdmin", columnDef: {size: 130}, initialVisible: false},
        {name: "firstMeetingDate", initialVisible: false},
        {name: "lastMeetingDate", initialVisible: false},
        {name: "completedMeetingsCount", initialVisible: false},
        {name: "completedMeetingsCountLastMonth"},
        {name: "plannedMeetingsCount", initialVisible: false},
        {name: "plannedMeetingsCountNextMonth"},
        ...getCreatedUpdatedColumns({entity: "staff"}),
      ].filter(NON_NULLABLE)}
      intrinsicFilter={showInactive() ? undefined : {type: "column", column: "staff.isActive", op: "=", val: true}}
      intrinsicSort={[{type: "column", column: "name", desc: false}]}
      initialSort={[{id: "name", desc: false}]}
      customSectionBelowTable={
        isFacilityAdmin() ? (
          <div class="flex items-center ml-2">
            <CheckboxInput
              checked={showInactive()}
              onChecked={setShowInactive}
              label={<span class="font-normal">{t("facility_user.staff.list_show_inactive")}</span>}
            />
          </div>
        ) : undefined
      }
    />
  );
}) satisfies VoidComponent;
