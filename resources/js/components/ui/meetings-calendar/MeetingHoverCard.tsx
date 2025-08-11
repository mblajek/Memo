import {useLangFunc} from "components/utils/lang";
import {useDictionaries} from "data-access/memo-api/dictionaries_and_attributes_context";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {MeetingDateAndTimeInfo} from "features/meeting/DateAndTimeInfo";
import {MeetingInSeriesInfo} from "features/meeting/MeetingInSeriesInfo";
import {MeetingStatusTags} from "features/meeting/MeetingStatusTags";
import {For, Show, VoidComponent} from "solid-js";
import {Capitalize} from "../Capitalize";
import {calendarIcons, facilityIcons} from "../icons";
import {RichTextView} from "../RichTextView";
import {AttendantListItem, FieldDisp} from "./meeting_details";
import {MeetingResourcesView} from "./MeetingResourcesView";

interface Props {
  readonly meeting: TQMeetingResource;
  /** The function called when the card is hovered. It is usually a signal to close it immediately. */
  readonly onHovered?: () => void;
}

export const MeetingHoverCard: VoidComponent<Props> = (props) => {
  const t = useLangFunc();
  const dictionaries = useDictionaries();
  return (
    <div class="max-w-sm bg-white border border-gray-400 rounded shadow p-1">
      <div
        class="flex flex-col gap-2 text-sm pointer-events-auto p-1"
        // pointer-events-auto to allow detecting hover, even if the outside has pointer-events-none,
        // which affects the borders.
        onPointerOver={() => props.onHovered?.()}
      >
        <div class="flex flex-col">
          <MeetingDateAndTimeInfo meeting={props.meeting} twoLines />
          <MeetingInSeriesInfo meeting={props.meeting} showLink={false} />
        </div>
        <Show when={props.meeting["resourceConflicts.*.resourceDictId"].length}>
          <div class="flex items-center gap-1 font-semibold text-red-600">
            <calendarIcons.Conflict class="text-current" size="30" />
            <div>{t("meetings.resource_conflicts.meeting_has_conflicts")}</div>
          </div>
        </Show>
        <div>{dictionaries()?.getPositionById(props.meeting.typeDictId).label}</div>
        <MeetingStatusTags meeting={props.meeting} />
        <Show when={props.meeting.isFacilityWide}>
          <div>
            <facilityIcons.Facility class="inlineIcon" />{" "}
            <Capitalize class="font-semibold" text={t("models.meeting.isFacilityWide")} />
          </div>
        </Show>
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
              {(client) => <AttendantListItem type="clients" attendant={client} showAttendance showUrgentNotes />}
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
            <MeetingResourcesView
              resourceIds={props.meeting.resources.map((r) => r.resourceDictId)}
              conflictingResourceIds={props.meeting["resourceConflicts.*.resourceDictId"]}
            />
          </FieldDisp>
        </Show>
      </div>
    </div>
  );
};
