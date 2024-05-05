import {InfoIcon} from "components/ui/InfoIcon";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {Show, VoidComponent} from "solid-js";

interface MeetingStatusInfoIconProps {
  readonly meetingStatusId?: string;
}

export const MeetingStatusInfoIcon: VoidComponent<MeetingStatusInfoIconProps> = (props) => {
  const t = useLangFunc();
  const {meetingStatusDict} = useFixedDictionaries();
  return (
    <InfoIcon
      href="/help/meeting-statuses#status"
      title={[
        props.meetingStatusId &&
          t(
            `dictionary.meetingStatus._explanations.${
              meetingStatusDict()!.getPosition(props.meetingStatusId).resource.name
            }`,
          ),
        t("dictionary.meetingStatus._explanations.more_info"),
      ]
        .filter(Boolean)
        .join("\n")}
    />
  );
};

interface MeetingAttendanceStatusInfoIconProps {
  readonly attendanceStatusId?: string;
  readonly meetingStatusId?: string;
}

export const MeetingAttendanceStatusInfoIcon: VoidComponent<MeetingAttendanceStatusInfoIconProps> = (props) => {
  const t = useLangFunc();
  const {meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  return (
    <InfoIcon
      href="/help/meeting-statuses#attendance-status"
      title={
        (props.attendanceStatusId &&
          (props.attendanceStatusId === attendanceStatusDict()?.ok.id
            ? props.meetingStatusId &&
              t(
                `dictionary.attendanceStatus._explanations.ok.${
                  meetingStatusDict()!.getPosition(props.meetingStatusId).resource.name
                }`,
              )
            : t(
                `dictionary.attendanceStatus._explanations.${
                  attendanceStatusDict()!.getPosition(props.attendanceStatusId).resource.name
                }`,
              ))) ||
        t("dictionary.attendanceStatus._explanations.more_info")
      }
    />
  );
};

interface MeetingAttendanceStatusProps {
  readonly attendanceStatusId: string;
  readonly meetingStatusId?: string;
}

export const MeetingAttendanceStatus: VoidComponent<MeetingAttendanceStatusProps> = (props) => {
  const t = useLangFunc();
  const {meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  return (
    <span>
      {attendanceStatusDict()?.getPosition(props.attendanceStatusId).label}
      <Show when={props.attendanceStatusId === attendanceStatusDict()?.ok.id && props.meetingStatusId}>
        {" "}
        <span class="text-grey-text">
          {t(
            `dictionary.attendanceStatus._ok_extra_info_by_meeting_status.${
              meetingStatusDict()!.getPosition(props.meetingStatusId!).resource.name
            }`,
          )}
        </span>
      </Show>
    </span>
  );
};
