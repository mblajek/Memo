import {Capitalize} from "components/ui/Capitalize";
import {EM_DASH} from "components/ui/symbols";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {TQMeetingAttendantResource} from "data-access/memo-api/tquery/calendar";
import {FacilityUserType} from "data-access/memo-api/user_display_names";
import {UserLink} from "features/facility-users/UserLink";
import {MeetingAttendanceStatus} from "features/meeting/attendance_status_info";
import {ParentComponent, Show, VoidComponent} from "solid-js";

interface AttendantListItemProps {
  readonly type: FacilityUserType;
  readonly attendant: TQMeetingAttendantResource;
  readonly showAttendance?: boolean;
}

export const AttendantListItem: VoidComponent<AttendantListItemProps> = (props) => {
  const {attendanceStatusDict} = useFixedDictionaries();
  return (
    <li>
      <UserLink type={props.type} link={false} userId={props.attendant.userId} name={props.attendant.name} />
      <Show when={props.showAttendance && props.attendant.attendanceStatusDictId !== attendanceStatusDict()?.ok.id}>
        {" "}
        <span class="text-grey-text">
          {EM_DASH} <MeetingAttendanceStatus attendanceStatusId={props.attendant.attendanceStatusDictId} />
        </span>
      </Show>
    </li>
  );
};

interface FieldLabelProps {
  readonly field: string;
}

export const FieldDisp: ParentComponent<FieldLabelProps> = (props) => {
  const t = useLangFunc();
  return (
    <div class="flex flex-col">
      <div class="font-medium">
        <Capitalize
          text={t("with_colon", {text: t([`models.meeting.${props.field}`, `models.generic.${props.field}`])})}
        />
      </div>
      <div>{props.children}</div>
    </div>
  );
};
