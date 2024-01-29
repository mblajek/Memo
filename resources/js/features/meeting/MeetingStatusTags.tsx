import {Tag, TagsLine} from "components/ui/Tag";
import {useLangFunc} from "components/utils";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {MeetingAttendantResource, MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {JSX, Match, Show, Switch, VoidComponent} from "solid-js";

interface MeetingStatusTagsProps {
  readonly meeting: Pick<MeetingResource, "statusDictId" | "staff" | "clients" | "isRemote">;
  /** If true, a single "planned" tag is shown for a planned meeting. If false, nothing is shown. */
  readonly showPlannedTag?: boolean;
}

export const MeetingStatusTags: VoidComponent<MeetingStatusTagsProps> = (props) => {
  const {meetingStatusDict, attendanceStatusDict} = useFixedDictionaries();
  const {
    PlannedTag,
    CompletedTag,
    CancelledByStaffTag,
    CancelledByClientTag,
    CancelledTag,
    ClientNoShowTag,
    ClientTooLateTag,
    ClientLatePresentTag,
    RemoteTag,
  } = useStatusTags();
  function anyHasStatus(attendants: readonly MeetingAttendantResource[], statusName: string) {
    return attendants.some(
      ({attendanceStatusDictId}) => attendanceStatusDictId === attendanceStatusDict()?.getPosition(statusName).id,
    );
  }
  const tags = () => {
    // This logic is subject to change based on feedback.
    const tags: JSX.Element[] = [];
    if (props.meeting.statusDictId === meetingStatusDict()?.completed.id) {
      tags.push(<CompletedTag />);
    }
    if (anyHasStatus(props.meeting.clients, "no_show")) {
      tags.push(<ClientNoShowTag />);
    }
    if (anyHasStatus(props.meeting.clients, "too_late")) {
      tags.push(<ClientTooLateTag />);
    }
    if (anyHasStatus(props.meeting.staff, "cancelled")) {
      tags.push(<CancelledByStaffTag />);
    }
    if (anyHasStatus(props.meeting.clients, "cancelled")) {
      tags.push(<CancelledByClientTag />);
    }
    if (props.meeting.statusDictId === meetingStatusDict()?.cancelled.id) {
      tags.push(<CancelledTag />);
    }
    if (anyHasStatus(props.meeting.clients, "late_present")) {
      tags.push(<ClientLatePresentTag />);
    }
    if (props.meeting.isRemote) {
      tags.push(<RemoteTag />);
    }
    return tags;
  };
  return (
    <Switch>
      <Match when={props.meeting.statusDictId !== meetingStatusDict()?.planned.id}>
        <TagsLine>{tags()}</TagsLine>
      </Match>
      <Match when={props.showPlannedTag}>
        <PlannedTag />
      </Match>
    </Switch>
  );
};

interface SimpleMeetingStatusTagProps {
  readonly status: string;
}

export const SimpleMeetingStatusTag: VoidComponent<SimpleMeetingStatusTagProps> = (props) => {
  const {meetingStatusDict} = useFixedDictionaries();

  const {PlannedTag, CompletedTag, CancelledTag} = useStatusTags();

  return (
    <Show when={meetingStatusDict()}>
      <Switch>
        <Match when={props.status === meetingStatusDict()?.planned.id}>
          <PlannedTag />
        </Match>
        <Match when={props.status === meetingStatusDict()?.completed.id}>
          <CompletedTag />
        </Match>
        <Match when={props.status === meetingStatusDict()?.cancelled.id}>
          <CancelledTag />
        </Match>
      </Switch>
    </Show>
  );
};

export function useStatusTags() {
  const t = useLangFunc();
  return {
    PlannedTag: () => <Tag color="#10648a">{t("dictionary.meetingStatus.planned")}</Tag>,
    CompletedTag: () => <Tag color="#2d8855">{t("dictionary.meetingStatus.completed")}</Tag>,
    CancelledByStaffTag: () => <Tag color="#88662c">{t("meetings.tags.cancelled_by_staff")}</Tag>,
    CancelledByClientTag: () => <Tag color="#4d1186">{t("meetings.tags.cancelled_by_client")}</Tag>,
    CancelledTag: () => <Tag color="#782c66">{t("dictionary.meetingStatus.cancelled")}</Tag>,
    ClientNoShowTag: () => <Tag color="#200000">{t("meetings.tags.client_no_show")}</Tag>,
    ClientTooLateTag: () => <Tag color="#400000">{t("meetings.tags.client_too_late")}</Tag>,
    ClientLatePresentTag: () => <Tag color="#005869">{t("meetings.tags.client_late_present")}</Tag>,
    RemoteTag: () => <Tag color="#705faf">{t("models.meeting.isRemote")}</Tag>,
  } satisfies Partial<Record<string, VoidComponent>>;
}
