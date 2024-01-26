import {InfoIcon} from "components/ui/InfoIcon";
import {useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {Show, VoidComponent, createMemo} from "solid-js";

interface MeetingStatusInfoIconProps {
  readonly meetingStatusId?: string;
}

export const MeetingStatusInfoIcon: VoidComponent<MeetingStatusInfoIconProps> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const meetingStatus = createMemo(() =>
    props.meetingStatusId ? dictionaries()?.getPositionById(props.meetingStatusId) : undefined,
  );
  return (
    <InfoIcon
      href="/help/meeting#status"
      title={[
        meetingStatus() && t(`dictionary.meetingStatus._explanations.${meetingStatus()!.name}`),
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
  const dictionaries = useDictionaries();
  const attendanceStatus = createMemo(() =>
    props.attendanceStatusId ? dictionaries()?.getPositionById(props.attendanceStatusId) : undefined,
  );
  const meetingStatus = createMemo(() =>
    props.meetingStatusId ? dictionaries()?.getPositionById(props.meetingStatusId) : undefined,
  );
  return (
    <InfoIcon
      href="/help/meeting#attendance-status"
      title={
        (attendanceStatus() &&
          (attendanceStatus()!.name === "ok"
            ? meetingStatus() && t(`dictionary.attendanceStatus._explanations.ok.${meetingStatus()!.name}`)
            : t(`dictionary.attendanceStatus._explanations.${attendanceStatus()!.name}`))) ||
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
  const dictionaries = useDictionaries();
  const attendanceStatus = createMemo(() =>
    props.attendanceStatusId ? dictionaries()?.getPositionById(props.attendanceStatusId) : undefined,
  );
  const meetingStatus = createMemo(() =>
    props.meetingStatusId ? dictionaries()?.getPositionById(props.meetingStatusId) : undefined,
  );
  return (
    <span>
      {attendanceStatus()?.label}
      <Show when={attendanceStatus()?.name === "ok" && meetingStatus()}>
        {" "}
        <span class="text-grey-text">
          {t(`dictionary.attendanceStatus._ok_extra_info_by_meeting_status.${meetingStatus()?.name}`)}
        </span>
      </Show>
    </span>
  );
};
