import {facilityIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils";
import {Show, VoidComponent} from "solid-js";
import {SUBTYPE_FACILITY_WIDE, WorkTimeFormSubtype} from "./WorkTimeViewEditForm";
import {UserLink} from "../facility-users/UserLink";

interface Props {
  readonly staff: WorkTimeFormSubtype["staff"];
}

export const WorkTimeStaff: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  return (
    <div class="text-lg">
      <Show
        when={props.staff !== SUBTYPE_FACILITY_WIDE && props.staff.id}
        fallback={
          <div class="flex gap-1 items-center">
            <facilityIcons.Facility size="20" />
            {t("meetings.facility_wide")}
          </div>
        }
      >
        {(staffId) => <UserLink type="staff" userId={staffId()} />}
      </Show>
    </div>
  );
};
