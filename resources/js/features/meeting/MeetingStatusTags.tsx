import {Tag, TagsLine} from "components/ui/Tag";
import {useLangFunc} from "components/utils";
import {useDictionaries} from "data-access/memo-api/dictionaries";
import {MeetingAttendantResource, MeetingResource} from "data-access/memo-api/resources/meeting.resource";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {JSX, VoidComponent} from "solid-js";

interface Props {
  readonly meeting: MeetingResource | TQMeetingResource;
}

export const MeetingStatusTags: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  const attendanceStatusDict = () => dictionaries()?.get("attendanceStatus");

  const CompletedTag: VoidComponent = () => <Tag color="#2d8855">{t("dictionary.meetingStatus.completed")}</Tag>;
  const CancelledByStaffTag: VoidComponent = () => (
    <Tag color="#88662c">
      <CancelledTag /> {t("meetings.tags.cancelled.by_staff")}
    </Tag>
  );
  const CancelledByClientTag: VoidComponent = () => (
    <Tag color="#4d1186">
      <CancelledTag /> {t("meetings.tags.cancelled.by_client")}
    </Tag>
  );
  const CancelledTag: VoidComponent = () => <Tag color="#782c66">{t("dictionary.meetingStatus.cancelled")}</Tag>;
  const ClientNoShowTag: VoidComponent = () => <Tag color="#200000">{t("meetings.tags.client_no_show")}</Tag>;
  const ClientTooLateTag: VoidComponent = () => <Tag color="#400000">{t("meetings.tags.client_too_late")}</Tag>;
  const ClientLatePresentTag: VoidComponent = () => <Tag color="#005869">{t("meetings.tags.client_late_present")}</Tag>;

  const RemoteTag: VoidComponent = () => <Tag color="#705faf">{t("models.meeting.isRemote")}</Tag>;

  function anyHasStatus(attendants: readonly MeetingAttendantResource[], statusName: string) {
    return attendants.some(
      ({attendanceStatusDictId}) => attendanceStatusDict()?.get(statusName).id === attendanceStatusDictId,
    );
  }

  const tags = () => {
    const tags: JSX.Element[] = [];
    const status = dictionaries()!.getPositionById(props.meeting.statusDictId);
    if (status.name === "completed") {
      tags.push(<CompletedTag />);
    }
    if (anyHasStatus(props.meeting.clients, "no_show")) {
      tags.push(<ClientNoShowTag />);
    }
    if (anyHasStatus(props.meeting.clients, "too_late")) {
      tags.push(<ClientTooLateTag />);
    }
    if (status.name === "cancelled") {
      let cancelledByAttendant = false;
      if (anyHasStatus(props.meeting.staff, "cancelled")) {
        tags.push(<CancelledByStaffTag />);
        cancelledByAttendant = true;
      }
      if (anyHasStatus(props.meeting.clients, "cancelled")) {
        tags.push(<CancelledByClientTag />);
        cancelledByAttendant = true;
      }
      if (!cancelledByAttendant) {
        tags.push(<CancelledTag />);
      }
    }
    if (anyHasStatus(props.meeting.clients, "late_present")) {
      tags.push(<ClientLatePresentTag />);
    }
    if (props.meeting.isRemote) {
      tags.push(<RemoteTag />);
    }
    return tags;
  };
  return <TagsLine>{tags()}</TagsLine>;
};
