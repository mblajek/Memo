import {facilityIcons} from "components/ui/icons";
import {useLangFunc} from "components/utils/lang";
import {Show, VoidComponent} from "solid-js";
import {UserLink} from "../facility-users/UserLink";
import {SUBTYPE_FACILITY_WIDE, WorkTimeFormSubtype} from "./work_time_form_subtype";

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
