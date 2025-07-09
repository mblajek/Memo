import {title} from "components/ui/title";
import {useLangFunc} from "components/utils/lang";
import {MeetingNotificationStatus} from "data-access/memo-api/resources/meeting.resource";
import {getNotificationSchema} from "features/meeting/MeetingAttendantsFields";
import {
  BiRegularMessageAltCheck,
  BiRegularMessageAltDots,
  BiRegularMessageAltError,
  BiRegularMessageAltMinus,
  BiRegularMessageAltX,
} from "solid-icons/bi";
import {Show, VoidComponent} from "solid-js";
import {z} from "zod";

type _Directives = typeof title;

interface Props {
  readonly notification: z.infer<ReturnType<typeof getNotificationSchema>> | undefined;
}

export const NotificationStatusIndicator: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const icon = () => {
    const status = props.notification?.status as MeetingNotificationStatus | undefined;
    if (!status) {
      return undefined;
    } else if (status === "sent" || status === "deduplicated") {
      return <BiRegularMessageAltCheck class="text-green-700" size={18} />;
    } else if (status === "scheduled") {
      return <BiRegularMessageAltDots class="text-blue-500" size={18} />;
    } else if (status === "error_address") {
      return <BiRegularMessageAltError class="text-red-600" size={18} />;
    } else if (status.startsWith("error")) {
      return <BiRegularMessageAltX class="text-red-600" size={18} />;
    } else if (status === "skipped") {
      return <BiRegularMessageAltMinus class="text-blue-500" size={18} />;
    } else {
      return <BiRegularMessageAltError class="text-red-600" size={18} />;
    }
  };
  return (
    <Show when={icon()}>
      {(icon) => (
        <div
          class="my-auto me-auto"
          use:title={[t("meetings.notification_info", props.notification), {placement: "right"}]}
        >
          {icon()}
        </div>
      )}
    </Show>
  );
};
