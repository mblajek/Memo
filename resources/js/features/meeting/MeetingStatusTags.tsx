import {Tag, TagsLine} from "components/ui/Tag";
import {useLangFunc} from "components/utils";
import {Position} from "data-access/memo-api/dictionaries";
import {useFixedDictionaries} from "data-access/memo-api/fixed_dictionaries";
import {
  MeetingClientResource,
  MeetingResource,
  MeetingStaffResource,
} from "data-access/memo-api/resources/meeting.resource";
import {JSX, Match, Show, Switch, VoidComponent} from "solid-js";

interface MeetingStatusTagsProps {
  readonly meeting: Partial<Pick<MeetingResource, "statusDictId" | "staff" | "clients" | "isRemote">>;
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
  function anyHasStatus(
    attendants: readonly (MeetingStaffResource | MeetingClientResource)[] | undefined,
    status: Position,
  ) {
    return attendants?.some(({attendanceStatusDictId}) => attendanceStatusDictId === status.id);
  }
  const tags = () => {
    if (!meetingStatusDict()) {
      return [];
    }
    // This logic is subject to change based on feedback.
    const tags: JSX.Element[] = [];
    if (props.meeting.statusDictId === meetingStatusDict()?.planned.id) {
      if (props.showPlannedTag) {
        tags.push(<PlannedTag />);
      }
    } else {
      if (props.meeting.statusDictId === meetingStatusDict()?.completed.id) {
        tags.push(<CompletedTag />);
      }
      if (anyHasStatus(props.meeting.clients, attendanceStatusDict()!.no_show)) {
        tags.push(<ClientNoShowTag />);
      }
      if (anyHasStatus(props.meeting.clients, attendanceStatusDict()!.too_late)) {
        tags.push(<ClientTooLateTag />);
      }
      if (anyHasStatus(props.meeting.staff, attendanceStatusDict()!.cancelled)) {
        tags.push(<CancelledByStaffTag />);
      }
      if (anyHasStatus(props.meeting.clients, attendanceStatusDict()!.cancelled)) {
        tags.push(<CancelledByClientTag />);
      }
      if (props.meeting.statusDictId === meetingStatusDict()?.cancelled.id) {
        tags.push(<CancelledTag />);
      }
      if (anyHasStatus(props.meeting.clients, attendanceStatusDict()!.late_present)) {
        tags.push(<ClientLatePresentTag />);
      }
    }
    if (props.meeting.isRemote) {
      tags.push(<RemoteTag />);
    }
    return tags;
  };
  return <TagsLine>{tags()}</TagsLine>;
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
    RemoteTag: () => <Tag color="#4d2dcb">{t("models.meeting.isRemote")}</Tag>,
  } satisfies Partial<Record<string, VoidComponent>>;
}
