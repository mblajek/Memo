import {createConfirmation} from "components/ui/confirmation";
import {LangFunc} from "components/utils/lang";
import {TQMeetingResource} from "data-access/memo-api/tquery/calendar";
import {createSignal, Show} from "solid-js";
import {MeetingInSeriesInfo} from "./MeetingInSeriesInfo";
import {SeriesDeleteOption} from "data-access/memo-api/groups/FacilityMeeting";

export type MeetingForDelete = Partial<Pick<TQMeetingResource, "interval" | "seriesNumber" | "seriesCount">>;

export async function confirmDelete(
  dialog: ReturnType<typeof createConfirmation>,
  t: LangFunc,
  meeting: MeetingForDelete,
): Promise<SeriesDeleteOption | undefined> {
  const [deleteOption, setDeleteOption] = createSignal<SeriesDeleteOption>("one");
  const seriesCount = meeting.seriesCount || 0;
  const seriesNumber = meeting.seriesNumber || 0;
  const countToDelete = () => {
    switch (deleteOption()) {
      case "one":
        return 1;
      case "from_this":
        return seriesCount - seriesNumber + 1;
      case "all":
        return seriesCount;
    }
  };
  const params = {
    title: t("forms.meeting_delete.form_name"),
    confirmText: <span>{t("forms.meeting_delete.submit", {count: countToDelete()})}</span>,
    body: () => (
      <Show when={seriesCount > 1} fallback={t("forms.meeting_delete.confirmation_text")}>
        <div class="mb-4">
          <div class="flex">
            <span class="mr-4">{t("forms.meeting_delete.series_info")}:</span>
            <MeetingInSeriesInfo meeting={meeting} />
          </div>
          <div class="mt-4">
            <label>
              <input
                type="radio"
                name="delete_option"
                value={"one"}
                checked={deleteOption() === "one"}
                onChange={() => setDeleteOption("one")}
              />
              <span class="ml-1">{t("forms.meeting_delete.one")}</span>
            </label>
          </div>
          {/* 
                We only show functionally distinct options. If the meeting is first or last in the series, FROM_THIS is 
                not needed -- it would be equivalent to either ALL (if first) or ONE (if last).
              */}
          <Show when={seriesNumber > 1 && seriesNumber < seriesCount}>
            <div>
              <label>
                <input
                  type="radio"
                  name="delete_option"
                  value={"from_this"}
                  checked={deleteOption() === "from_this"}
                  onChange={() => setDeleteOption("from_this")}
                />
                <span class="ml-1">
                  {t("forms.meeting_delete.from_this", {
                    // The message expects count of the following meetings, excluding the current one.
                    count: seriesCount - seriesNumber,
                  })}
                </span>
              </label>
            </div>
          </Show>
          <div>
            <label>
              <input
                type="radio"
                name="delete_option"
                value={"all"}
                checked={deleteOption() === "all"}
                onChange={() => setDeleteOption("all")}
              />
              <span class="ml-1">
                {t("forms.meeting_delete.all", {
                  count: seriesCount,
                })}
              </span>
            </label>
          </div>
        </div>
      </Show>
    ),
  };
  if (!(await dialog.confirm(params))) {
    return undefined;
  }
  // eslint-disable-next-line solid/reactivity
  return deleteOption();
}
