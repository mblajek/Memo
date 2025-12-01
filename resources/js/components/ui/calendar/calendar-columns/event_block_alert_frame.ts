import {getUrgentNotesData} from "components/ui/urgent_notes";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";

/** Returns the class to apply to the meeting block caused by extra circumstances. */
export function eventBlockAlertFrameClass(meeting: TQMeetingResource) {
  return [
    meeting["resourceConflicts.*.resourceDictId"].length ? "!border-l-4 !border-l-red-600 !border-red-600" : undefined,
    meeting.clients.some((client) => getUrgentNotesData(client.urgentNotes).some((note) => note.priority === "normal"))
      ? "!border-s-8 !border-purple-600"
      : undefined,
  ];
}
