import {DocsModal, DocsModalInfoIcon} from "components/ui/docs_modal";
import {closeAllSelects} from "components/ui/form/Select";
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
    <DocsModalInfoIcon
      href="/help/meeting-statuses-status.part"
      fullPageHref="/help/meeting-statuses#status"
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
  readonly docsModal: DocsModal;
  readonly attendanceStatusId?: string;
  readonly meetingStatusId?: string;
}

export const MeetingAttendanceStatusInfoIcon: VoidComponent<MeetingAttendanceStatusInfoIconProps> = (props) => {
  const t = useLangFunc();
  const {meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  return (
    <Show when={props.attendanceStatusId ? attendanceStatusDict()?.getPosition(props.attendanceStatusId) : undefined}>
      {(attendanceStatus) => (
        <Show when={attendanceStatus().resource.isFixed}>
          <DocsModalInfoIcon
            staticDocsModal={props.docsModal}
            href="/help/meeting-statuses-attendance-status.part"
            fullPageHref="/help/meeting-statuses#attendance-status"
            title={
              (attendanceStatus().id === attendanceStatusDict()?.ok.id
                ? props.meetingStatusId &&
                  t(
                    `dictionary.attendanceStatus._explanations.ok.${
                      meetingStatusDict()!.getPosition(props.meetingStatusId).resource.name
                    }`,
                  )
                : t(`dictionary.attendanceStatus._explanations.${attendanceStatus().resource.name}`, {
                    defaultValue: "",
                  })) || t("dictionary.attendanceStatus._explanations.more_info")
            }
            onClick={(e) => {
              e.stopPropagation();
              closeAllSelects();
            }}
          />
        </Show>
      )}
    </Show>
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

export function useAttendanceStatusesInfo() {
  const {attendanceStatusDict} = useFixedDictionaries();
  return {
    /**
     * Returns a list of attendance statuses that denote presence on the meeting.
     * TODO: Consider if some non-fixed statuses can also denote presence.
     */
    presenceStatuses: () =>
      attendanceStatusDict() ? [attendanceStatusDict()!.ok.id, attendanceStatusDict()!.late_present.id] : undefined,
  };
}
