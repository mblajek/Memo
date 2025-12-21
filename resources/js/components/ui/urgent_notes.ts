import {NON_NULLABLE} from "components/utils/array_filter";

export const URGENT_NOTE_LOW_PRIORITY_PREFIX = "*";

type UrgentNotePriority = "normal" | "low";

export interface UrgentNoteData {
  readonly priority: UrgentNotePriority;
  readonly text: string;
}

export function getUrgentNotesData(urgentNotes: readonly string[] | null | undefined): readonly UrgentNoteData[] {
  if (!urgentNotes) {
    return [];
  }
  return urgentNotes
    .map((note): UrgentNoteData | undefined => {
      const isLowPriority = note.startsWith(URGENT_NOTE_LOW_PRIORITY_PREFIX);
      if (isLowPriority) {
        const text = note.slice(URGENT_NOTE_LOW_PRIORITY_PREFIX.length).trim();
        return text ? {priority: "low", text} : undefined;
      }
      return {priority: "normal", text: note};
    })
    .filter(NON_NULLABLE);
}
