import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {MeetingDateAndTimeInfo} from "features/meeting/DateAndTimeInfo";
import {MeetingInSeriesInfo} from "features/meeting/MeetingInSeriesInfo";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {For, Show, VoidComponent} from "solid-js";
import {RichTextView} from "../RichTextView";
import {AttendantListItem, FieldDisp} from "./meeting_details";

interface Props {
  readonly meeting: TQMeetingResource;
}

export const MeetingHoverCard: VoidComponent<Props> = (props) => {
  const dictionaries = useDictionaries();
  return (
    <div class="max-w-sm bg-white border border-gray-400 rounded shadow p-2 flex flex-col gap-2 text-sm">
      <div class="flex flex-col">
        <MeetingDateAndTimeInfo meeting={props.meeting} twoLines />
        <MeetingInSeriesInfo meeting={props.meeting} />
      </div>
      <div>{dictionaries()?.getPositionById(props.meeting.typeDictId).label}</div>
      <MeetingStatusTags meeting={props.meeting} />
      <Show when={props.meeting.staff.length}>
        <ul>
          <For each={props.meeting.staff}>
            {(staff) => <AttendantListItem type="staff" attendant={staff} showAttendance />}
          </For>
        </ul>
      </Show>
      <Show when={props.meeting.clients.length}>
        <ul>
          <For each={props.meeting.clients}>
            {(client) => <AttendantListItem type="clients" attendant={client} showAttendance />}
          </For>
        </ul>
      </Show>
      <Show when={props.meeting.notes}>
        <FieldDisp field="notes">
          <RichTextView class="max-h-60 disabledScrollBar" text={props.meeting.notes || undefined} />
        </FieldDisp>
      </Show>
      <Show when={props.meeting.resources.length}>
        <FieldDisp field="resources">
          <div class="wrapText">
            {props.meeting.resources
              .map((r) => dictionaries()?.getPositionById(r.resourceDictId).label)
              // Join by comma because Intl.ListFormat doesn't seem to work very well in Polish.
              .join(", ")}
          </div>
        </FieldDisp>
      </Show>
    </div>
  );
};
